use anchor_lang::prelude::*;
use anchor_lang::system_program;

use crate::errors::AjoError;
use crate::state::{GroupState, GroupStatus, MemberState};
use anchor_spl::token::{self, Token};

#[derive(Accounts)]
pub struct DeleteGroup<'info> {
    /// The admin deleting the group.
    #[account(
        mut,
        constraint = admin.key() == group_state.admin @ AjoError::NotAdmin
    )]
    pub admin: Signer<'info>,

    /// The group to delete.
    #[account(
        mut,
        close = admin,
        constraint = group_state.status == GroupStatus::Filling @ AjoError::GroupNotFilling,
        constraint = group_state.members.is_empty() || (group_state.members.len() == 1 && group_state.members[0] == admin.key()) @ AjoError::GroupHasMembers,
    )]
    pub group_state: Account<'info, GroupState>,

    /// The admin's member state (since admin is auto-added).
    #[account(
        mut,
        close = admin,
        seeds = [b"member", group_state.key().as_ref(), admin.key().as_ref()],
        bump = member_state.bump,
    )]
    pub member_state: Account<'info, MemberState>,

    /// The vault PDA.
    #[account(
        mut,
        seeds = [b"vault", group_state.key().as_ref()],
        bump = group_state.vault_bump,
    )]
    pub vault: SystemAccount<'info>,

    /// Optional mint for stablecoin support.
    /// CHECK: Validated in handler if group has mint.
    pub mint: AccountInfo<'info>,

    /// Vault token account if using SPL.
    /// CHECK: Validated in handler if group has mint.
    #[account(mut)]
    pub vault_token_account: AccountInfo<'info>,

    /// Admin's token account if using SPL (receives the refund).
    /// CHECK: Validated in handler if group has mint.
    #[account(mut)]
    pub admin_token_account: AccountInfo<'info>,

    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
}

pub fn delete_group_handler(ctx: Context<DeleteGroup>) -> Result<()> {
    let group = &ctx.accounts.group_state;
    let vault = &ctx.accounts.vault;
    let admin = &ctx.accounts.admin;

    // Refund vault balance to admin (this includes gas reserve and admin's collateral)
    let vault_balance = vault.lamports();
    
    if vault_balance > 0 {
        let group_pubkey = group.key();
        let seeds = &[
            b"vault",
            group_pubkey.as_ref(),
            &[group.vault_bump],
        ];
        let signer = &[&seeds[..]];

        if let Some(mint_key) = group.mint {
            // Validate mint
            require!(ctx.accounts.mint.key() == mint_key, AjoError::InvalidTokenProgram);

            // Admin token refund should be mathematically exactly their collateral + contribution.
            // Since admin is the only member left (verified by constraint), the vault should contain precisely this amount.
            let total_refund = ctx.accounts.member_state.collateral_balance
                .checked_add(group.contribution_amount)
                .ok_or(AjoError::ArithmeticOverflow)?;

            if total_refund > 0 {
                token::transfer(
                    CpiContext::new_with_signer(
                        ctx.accounts.token_program.to_account_info(),
                        token::Transfer {
                            from: ctx.accounts.vault_token_account.to_account_info(),
                            to: ctx.accounts.admin_token_account.to_account_info(),
                            authority: vault.to_account_info(),
                        },
                        signer,
                    ),
                    total_refund,
                )?;
            }
            
            // To prevent rent leaks and fully clean up, close the vault's ATA and return its rent lamports to admin.
            token::close_account(
                CpiContext::new_with_signer(
                    ctx.accounts.token_program.to_account_info(),
                    token::CloseAccount {
                        account: ctx.accounts.vault_token_account.to_account_info(),
                        destination: admin.to_account_info(),
                        authority: vault.to_account_info(),
                    },
                    signer,
                )
            )?;
        }

        // Refund any remaining SOL overhead to admin
        if vault_balance > 0 {
            system_program::transfer(
                CpiContext::new_with_signer(
                    ctx.accounts.system_program.to_account_info(),
                    system_program::Transfer {
                        from: vault.to_account_info(),
                        to: admin.to_account_info(),
                    },
                    signer,
                ),
                vault_balance,
            )?;
        }
    }

    msg!("Group '{}' deleted by admin. Funds returned.", group.name);

    Ok(())
}
