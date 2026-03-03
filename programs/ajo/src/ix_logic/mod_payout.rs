use anchor_lang::prelude::*;
use anchor_lang::Discriminator;
use anchor_spl::token::{self, Mint, Token, TokenAccount, Transfer};

use crate::errors::AjoError;
use crate::state::{GroupState, GroupStatus, RoundState};
use crate::ix_logic::mod_start_cycle::GRACE_PERIOD_SECONDS;
use crate::ix_logic::mod_initialize_group::{WEEKLY_SECONDS, MONTHLY_SECONDS};

/// Platform fee: 0.5% = 50 basis points.
pub const PLATFORM_FEE_BPS: u64 = 50;
pub const BPS_DENOMINATOR: u64 = 10_000;

#[derive(Accounts)]
pub struct PayoutRound<'info> {
    /// The caller (keeper server). Anyone can call once all contributions are settled.
    #[account(mut)]
    pub caller: Signer<'info>,

    /// The group.
    #[account(mut)]
    pub group_state: Account<'info, GroupState>,

    /// The current round state.
    #[account(
        mut,
        constraint = round_state.group == group_state.key() @ AjoError::RoundMismatch,
        constraint = round_state.round_number == group_state.current_round @ AjoError::RoundMismatch,
        constraint = !round_state.payout_sent @ AjoError::PayoutAlreadySent,
    )]
    pub round_state: Account<'info, RoundState>,

    /// The vault PDA (source of payout funds).
    /// CHECK: PDA-controlled SOL holding account.
    #[account(
        mut,
        seeds = [b"vault", group_state.key().as_ref()],
        bump = group_state.vault_bump,
    )]
    pub vault: SystemAccount<'info>,

    /// The round recipient's wallet (receives payout).
    /// CHECK: Destination wallet for payout transfer.
    #[account(mut)]
    pub recipient: UncheckedAccount<'info>,

    /// The platform wallet.
    /// CHECK: Receives the flat platform fee at entry points.
    #[account(mut)]
    pub platform_wallet: UncheckedAccount<'info>,

    /// Optional mint for stablecoin support.
    /// CHECK: Validated in handler if group has mint.
    pub mint: AccountInfo<'info>,

    /// Vault token account if using SPL.
    /// CHECK: Validated in handler if group has mint.
    #[account(mut)]
    pub vault_token_account: AccountInfo<'info>,

    /// Recipient's token account if using SPL.
    /// CHECK: Validated in handler if group has mint.
    #[account(mut)]
    pub recipient_token_account: AccountInfo<'info>,

    /// Next round state PDA (created if not the last round).
    /// CHECK: Manual initialization in handler if needed.
    #[account(mut)]
    pub next_round_state: UncheckedAccount<'info>,

    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
}

/// Executes payout to the round recipient once all contributions are settled.
/// Recipient receives 100% of the payout amount (fees are paid at entry).
pub fn payout_handler(ctx: Context<PayoutRound>) -> Result<()> {
    let round = &mut ctx.accounts.round_state;
    let group = &mut ctx.accounts.group_state;

    // Validate group is active
    require!(
        group.status == GroupStatus::Active,
        AjoError::GroupNotActive
    );

    // Validate all contributions are settled
    require!(
        round.contributions_received.iter().all(|&paid| paid),
        AjoError::ContributionsMissing
    );

    let payout = group.payout_amount;
    let fee = 0; // Removed 0.5% fee

    // Validate recipient is the correct member for this round
    let recipient_index = (round.round_number - 1) as usize;
    require!(
        ctx.accounts.recipient.key() == group.members[recipient_index],
        AjoError::NotAMember
    );

    // Transfer payout from vault to recipient (CPI with seeds)
    let group_key = group.key();
    let vault_seeds: &[&[u8]] = &[
        b"vault",
        group_key.as_ref(),
        &[group.vault_bump],
    ];
    let signer_seeds = &[vault_seeds];

    // Transfer payout (100% of payout_amount)
    if let Some(mint_key) = group.mint {
        // Validate mint
        require!(ctx.accounts.mint.key() == mint_key, AjoError::InvalidTokenProgram);

        let token_program = &ctx.accounts.token_program;
        let from = &ctx.accounts.vault_token_account;
        let to = &ctx.accounts.recipient_token_account;

        token::transfer(
            CpiContext::new_with_signer(
                token_program.to_account_info(),
                Transfer {
                    from: from.to_account_info(),
                    to: to.to_account_info(),
                    authority: ctx.accounts.vault.to_account_info(),
                },
                signer_seeds,
            ),
            payout,
        )?;
    } else {
        anchor_lang::system_program::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.system_program.to_account_info(),
                anchor_lang::system_program::Transfer {
                    from: ctx.accounts.vault.to_account_info(),
                    to: ctx.accounts.recipient.to_account_info(),
                },
                signer_seeds,
            ),
            payout,
        )?;
    }

    // Fee transfer removed as fees are now collected at entry points.

    // Mark payout as sent
    round.payout_sent = true;

    msg!(
        "Payout of {} lamports sent to {} for group {} round {}. Fee: {} lamports",
        payout,
        ctx.accounts.recipient.key(),
        group.key(),
        round.round_number,
        fee,
    );

    // Advance to next round or complete the cycle
    if group.current_round < group.member_count {
        let next_round_num = group.current_round + 1;
        group.current_round = next_round_num;

        let now = Clock::get()?.unix_timestamp;
        use crate::ix_logic::mod_initialize_group::{DAILY_SECONDS, YEARLY_SECONDS};
        let interval = match group.round_interval {
            0 => DAILY_SECONDS,
            1 => WEEKLY_SECONDS,
            2 => MONTHLY_SECONDS,
            3 => YEARLY_SECONDS,
            _ => WEEKLY_SECONDS,
        };
        let due = now.checked_add(interval).ok_or(AjoError::ArithmeticOverflow)?;
        let grace_end = due.checked_add(GRACE_PERIOD_SECONDS).ok_or(AjoError::ArithmeticOverflow)?;

        // Manual Initialization of RoundState PDA
        let seeds = &[
            b"round",
            group_key.as_ref(),
            &next_round_num.to_le_bytes(),
        ];
        let (pda, bump) = Pubkey::find_program_address(seeds, ctx.program_id);

        require!(
            ctx.accounts.next_round_state.key() == pda,
            AjoError::RoundMismatch
        );

        let space = 8 + RoundState::INIT_SPACE;
        let lamports = Rent::get()?.minimum_balance(space);

        // CPI to system program
        anchor_lang::solana_program::program::invoke_signed(
            &anchor_lang::solana_program::system_instruction::create_account(
                ctx.accounts.caller.key,
                ctx.accounts.next_round_state.key,
                lamports,
                space as u64,
                ctx.program_id,
            ),
            &[
                ctx.accounts.caller.to_account_info(),
                ctx.accounts.next_round_state.to_account_info(),
                ctx.accounts.system_program.to_account_info(),
            ],
            &[&[
                b"round",
                group_key.as_ref(),
                &next_round_num.to_le_bytes(),
                &[bump],
            ]],
        )?;

        // Initialize Data
        let next_round_info = ctx.accounts.next_round_state.to_account_info();
        let next_round_state = RoundState {
            group: group_key,
            round_number: next_round_num,
            due_timestamp: due,
            grace_end_timestamp: grace_end,
            contributions_received: vec![false; group.member_count as usize],
            payout_sent: false,
            bump,
        };

        let mut data = next_round_info.try_borrow_mut_data()?;
        let discriminator = RoundState::DISCRIMINATOR;
        data[..8].copy_from_slice(&discriminator);
        let mut writer = std::io::Cursor::new(&mut data[8..]);
        next_round_state.serialize(&mut writer)?;

        msg!(
            "Round {} complete for group {}. Advancing to round {}",
            round.round_number,
            group.key(),
            next_round_num,
        );
    } else {
        // Last round — cycle is complete
        group.status = GroupStatus::Completed;

        msg!(
            "Cycle complete for group {}. All {} rounds finished. Collateral refund available.",
            group.key(),
            group.member_count,
        );
    }

    // Clear any active governance proposal upon advancing/completing round
    group.active_proposal = None;

    msg!("PayoutRound: Success for Round {} of Group {}", round.round_number, group.key());
    Ok(())
}
