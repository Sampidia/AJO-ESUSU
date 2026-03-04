use anchor_lang::prelude::*;
use anchor_lang::system_program;
use anchor_spl::associated_token::AssociatedToken;
use anchor_spl::token::{self, Mint, Token, TokenAccount, Transfer};

use crate::errors::AjoError;
use crate::state::{GroupState, GroupStatus, MemberState};

/// Development mode: use short intervals for testing.
/// In production, change WEEKLY to 7*24*60*60 and MONTHLY to 30*24*60*60.
pub const DAILY_SECONDS: i64 = 2 * 60;   // 2 minutes (dev); production: 86_400
pub const WEEKLY_SECONDS: i64 = 5 * 60;  // 5 minutes (dev); production: 604_800
pub const MONTHLY_SECONDS: i64 = 10 * 60; // 10 minutes (dev); production: 2_592_000
pub const YEARLY_SECONDS: i64 = 30 * 60; // 30 minutes (dev); production: 31_536_000
pub const PLATFORM_FEE_SOL: u64 = 10_000_000;      // 0.01 SOL
pub const PLATFORM_FEE_USDC: u64 = 500_000;         // 0.5 USDC (6 decimals)
pub const MIN_PAYOUT_LAMPORTS: u64 = 1_000_000;    // 0.001 SOL or 1 USDC

/// Gas reserve per member per round (covers worst-case auto-pull + payout txs).
pub const GAS_PER_TX: u64 = 20_000; // ~0.00002 SOL per tx
pub const TXS_PER_MEMBER_PER_ROUND: u64 = 3; // contribute + potential auto_pull + payout share

#[derive(Accounts)]
#[instruction(name: String, member_count: u8, payout_amount: u64, round_interval: u8, mint: Option<Pubkey>)]
pub struct InitializeGroup<'info> {
    /// The admin creates the group and pays the flat 0.01 SOL platform fee.
    #[account(mut)]
    pub admin: Signer<'info>,

    /// The group state PDA.
    #[account(
        init,
        payer = admin,
        space = 8 + GroupState::INIT_SPACE,
        seeds = [b"group", admin.key().as_ref(), name.as_bytes()],
        bump,
    )]
    pub group_state: Account<'info, GroupState>,

    /// The vault PDA that holds all funds (collateral + contributions).
    /// CHECK: This is a PDA-controlled account for holding SOL. Not deserialized.
    #[account(
        mut,
        seeds = [b"vault", group_state.key().as_ref()],
        bump,
    )]
    pub vault: SystemAccount<'info>,

    /// The platform fee recipient wallet.
    /// CHECK: Receives the flat platform creation fee. Not deserialized.
    #[account(mut)]
    pub platform_wallet: UncheckedAccount<'info>,

    /// Platform token account if using SPL.
    /// CHECK: Validated in handler if mint is present.
    #[account(mut)]
    pub platform_token_account: AccountInfo<'info>,

    /// Admin's member state PDA.
    #[account(
        init,
        payer = admin,
        space = 8 + MemberState::INIT_SPACE,
        seeds = [b"member", group_state.key().as_ref(), admin.key().as_ref()],
        bump,
    )]
    pub member_state: Account<'info, MemberState>,

    /// Optional mint for stablecoin support.
    /// CHECK: Validated in handler.
    pub mint: AccountInfo<'info>,

    /// Vault token account if using SPL.
    /// CHECK: Validated/Initialized in handler if mint is present.
    #[account(mut)]
    pub vault_token_account: AccountInfo<'info>,

    /// Admin token account if using SPL.
    /// CHECK: Validated in handler if mint is present.
    #[account(mut)]
    pub admin_token_account: AccountInfo<'info>,

    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
}

pub fn initialize_group_handler(
    ctx: Context<InitializeGroup>,
    name: String,
    member_count: u8,
    payout_amount: u64,
    round_interval: u8,
    mint: Option<Pubkey>,
) -> Result<()> {
    // --- Validations ---
    require!(
        !name.is_empty() && name.len() <= 32,
        AjoError::InvalidGroupName
    );
    require!(
        member_count >= 2 && member_count <= 20,
        AjoError::InvalidMemberCount
    );
    require!(payout_amount >= MIN_PAYOUT_LAMPORTS, AjoError::MinPayoutNotMet);
    require!(round_interval <= 3, AjoError::InvalidRoundInterval);

    // --- Auto-calculate derived values ---
    let contribution_amount = payout_amount
        .checked_div(member_count as u64)
        .ok_or(AjoError::ArithmeticOverflow)?;

    // Ensure payout divides evenly by member count
    require!(
        contribution_amount
            .checked_mul(member_count as u64)
            .ok_or(AjoError::ArithmeticOverflow)?
            == payout_amount,
        AjoError::PayoutNotDivisible
    );

    let collateral_amount = payout_amount; // Collateral = Payout Amount

    // --- Gas reserve ---
    // A flat 0.005 SOL reserve is enough for rent-exempt vault + gas for all rounds.
    let gas_reserve = 5_000_000;

    // --- Transfer gas reserve to vault ---
    system_program::transfer(
        CpiContext::new(
            ctx.accounts.system_program.to_account_info(),
            system_program::Transfer {
                from: ctx.accounts.admin.to_account_info(),
                to: ctx.accounts.vault.to_account_info(),
            },
        ),
        gas_reserve,
    )?;

    // --- Transfer platform fee ---
    if let Some(mint_key) = mint {
        // Validate mint and SPL accounts
        require!(ctx.accounts.mint.key() == mint_key, AjoError::InvalidTokenProgram);
        
        // Initialize vault ATA if needed
        if ctx.accounts.vault_token_account.data_is_empty() {
            anchor_spl::associated_token::create(
                CpiContext::new(
                    ctx.accounts.associated_token_program.to_account_info(),
                    anchor_spl::associated_token::Create {
                        payer: ctx.accounts.admin.to_account_info(),
                        associated_token: ctx.accounts.vault_token_account.to_account_info(),
                        authority: ctx.accounts.vault.to_account_info(),
                        mint: ctx.accounts.mint.to_account_info(),
                        system_program: ctx.accounts.system_program.to_account_info(),
                        token_program: ctx.accounts.token_program.to_account_info(),
                    },
                ),
            )?;
        }

        // Initialize platform ATA if needed
        if ctx.accounts.platform_token_account.data_is_empty() {
            anchor_spl::associated_token::create(
                CpiContext::new(
                    ctx.accounts.associated_token_program.to_account_info(),
                    anchor_spl::associated_token::Create {
                        payer: ctx.accounts.admin.to_account_info(),
                        associated_token: ctx.accounts.platform_token_account.to_account_info(),
                        authority: ctx.accounts.platform_wallet.to_account_info(),
                        mint: ctx.accounts.mint.to_account_info(),
                        system_program: ctx.accounts.system_program.to_account_info(),
                        token_program: ctx.accounts.token_program.to_account_info(),
                    },
                ),
            )?;
        }

        let token_program = &ctx.accounts.token_program;
        let from = &ctx.accounts.admin_token_account;
        let to = &ctx.accounts.platform_token_account;
        
        token::transfer(
            CpiContext::new(
                token_program.to_account_info(),
                Transfer {
                    from: from.to_account_info(),
                    to: to.to_account_info(),
                    authority: ctx.accounts.admin.to_account_info(),
                },
            ),
            PLATFORM_FEE_USDC, // 0.5 USDC
        )?;
    } else {
        system_program::transfer(
            CpiContext::new(
                ctx.accounts.system_program.to_account_info(),
                system_program::Transfer {
                    from: ctx.accounts.admin.to_account_info(),
                    to: ctx.accounts.platform_wallet.to_account_info(),
                },
            ),
            PLATFORM_FEE_SOL, // 0.01 SOL
        )?;
    }

    // --- Add Admin as First Member (Transfer Collateral + First Contribution) ---
    let init_deposit = collateral_amount
        .checked_add(contribution_amount)
        .ok_or(AjoError::ArithmeticOverflow)?;

    if let Some(_mint_key) = mint {
        // SPL Token Case
        let token_program = &ctx.accounts.token_program;
        let from = &ctx.accounts.admin_token_account;
        let to = &ctx.accounts.vault_token_account;

        token::transfer(
            CpiContext::new(
                token_program.to_account_info(),
                Transfer {
                    from: from.to_account_info(),
                    to: to.to_account_info(),
                    authority: ctx.accounts.admin.to_account_info(),
                },
            ),
            init_deposit,
        )?;
    } else {
        // Native SOL Case
        system_program::transfer(
            CpiContext::new(
                ctx.accounts.system_program.to_account_info(),
                system_program::Transfer {
                    from: ctx.accounts.admin.to_account_info(),
                    to: ctx.accounts.vault.to_account_info(),
                },
            ),
            init_deposit,
        )?;
    }

    // --- Initialize group state ---
    let group = &mut ctx.accounts.group_state;
    group.admin = ctx.accounts.admin.key();
    group.name = name;
    group.member_count = member_count;
    group.payout_amount = payout_amount;
    group.contribution_amount = contribution_amount;
    group.collateral_amount = collateral_amount;

    msg!("InitializeGroup: Success. Payout: {}, Contribution: {}, Collateral: {}", 
        payout_amount, contribution_amount, collateral_amount);
    group.round_interval = round_interval;
    group.current_round = 0;
    group.members = vec![ctx.accounts.admin.key()]; // Add admin as first member
    group.status = GroupStatus::Filling;
    group.mint = mint;
    group.active_proposal = None;
    group.bump = ctx.bumps.group_state;
    group.vault_bump = ctx.bumps.vault;

    // --- Initialize admin's member state ---
    let member_state = &mut ctx.accounts.member_state;
    member_state.wallet = ctx.accounts.admin.key();
    member_state.group = group.key();
    member_state.collateral_balance = collateral_amount;
    member_state.rotation_position = 0; // Admin is always #1
    member_state.joined_at = Clock::get()?.unix_timestamp;
    member_state.refunded = false;
    member_state.bump = ctx.bumps.member_state;
    member_state.last_voted_proposal = 0;

    msg!(
        "Group '{}' initialized by {}. ID: {}",
        group.name,
        group.admin,
        group.key(),
    );

    Ok(())
}
