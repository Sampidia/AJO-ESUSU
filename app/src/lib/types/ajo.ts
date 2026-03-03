/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/ajo.json`.
 */
export type Ajo = {
  "address": "CR6pmRS8pcrc2grm2Hiq8Ny9fhvRV7mx6dYN5Bbs829X",
  "metadata": {
    "name": "ajo",
    "version": "0.1.0",
    "spec": "0.1.0",
    "description": "Ajo/Esusu — Community Savings on Solana"
  },
  "instructions": [
    {
      "name": "autoPull",
      "docs": [
        "After grace period, pulls contribution from a defaulter's collateral.",
        "Anyone can call this for any unpaid member once the grace period expires."
      ],
      "discriminator": [
        232,
        108,
        193,
        125,
        121,
        203,
        216,
        14
      ],
      "accounts": [
        {
          "name": "caller",
          "docs": [
            "The caller (keeper server). Anyone can call after grace period."
          ],
          "signer": true
        },
        {
          "name": "groupState",
          "docs": [
            "The group."
          ]
        },
        {
          "name": "memberState",
          "docs": [
            "The defaulting member's state."
          ],
          "writable": true
        },
        {
          "name": "roundState",
          "docs": [
            "The current round state."
          ],
          "writable": true
        }
      ],
      "args": [
        {
          "name": "memberIndex",
          "type": "u8"
        }
      ]
    },
    {
      "name": "contribute",
      "docs": [
        "Member contributes their share for the current round.",
        "Transfers exactly contribution_amount to the vault."
      ],
      "discriminator": [
        82,
        33,
        68,
        131,
        32,
        0,
        205,
        95
      ],
      "accounts": [
        {
          "name": "member",
          "docs": [
            "The member contributing."
          ],
          "writable": true,
          "signer": true
        },
        {
          "name": "groupState",
          "docs": [
            "The group."
          ]
        },
        {
          "name": "memberState",
          "docs": [
            "The member's state."
          ]
        },
        {
          "name": "roundState",
          "docs": [
            "The current round state."
          ],
          "writable": true
        },
        {
          "name": "vault",
          "docs": [
            "The vault PDA."
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "groupState"
              }
            ]
          }
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": []
    },
    {
      "name": "deleteGroup",
      "docs": [
        "Deletes a group (Admin only, before any other members join)."
      ],
      "discriminator": [
        42,
        84,
        38,
        134,
        108,
        81,
        86,
        32
      ],
      "accounts": [
        {
          "name": "admin",
          "docs": [
            "The admin deleting the group."
          ],
          "writable": true,
          "signer": true
        },
        {
          "name": "groupState",
          "docs": [
            "The group to delete."
          ],
          "writable": true
        },
        {
          "name": "memberState",
          "docs": [
            "The admin's member state (since admin is auto-added)."
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  109,
                  101,
                  109,
                  98,
                  101,
                  114
                ]
              },
              {
                "kind": "account",
                "path": "groupState"
              },
              {
                "kind": "account",
                "path": "admin"
              }
            ]
          }
        },
        {
          "name": "vault",
          "docs": [
            "The vault PDA."
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "groupState"
              }
            ]
          }
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": []
    },
    {
      "name": "payoutRound",
      "docs": [
        "Executes payout to the round recipient once all contributions are settled.",
        "Deducts 0.5% platform fee and advances to the next round."
      ],
      "discriminator": [
        235,
        156,
        85,
        43,
        66,
        69,
        234,
        87
      ],
      "accounts": [
        {
          "name": "caller",
          "docs": [
            "The caller (keeper server). Anyone can call once all contributions are settled."
          ],
          "writable": true,
          "signer": true
        },
        {
          "name": "groupState",
          "docs": [
            "The group."
          ],
          "writable": true
        },
        {
          "name": "roundState",
          "docs": [
            "The current round state."
          ],
          "writable": true
        },
        {
          "name": "vault",
          "docs": [
            "The vault PDA (source of payout funds)."
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "groupState"
              }
            ]
          }
        },
        {
          "name": "recipient",
          "docs": [
            "The round recipient's wallet (receives payout)."
          ],
          "writable": true
        },
        {
          "name": "platformWallet",
          "docs": [
            "The platform wallet (receives fee)."
          ],
          "writable": true
        },
        {
          "name": "mint",
          "docs": [
            "Optional mint for stablecoin support."
          ]
        },
        {
          "name": "vaultTokenAccount",
          "docs": [
            "Vault token account if using SPL."
          ],
          "writable": true
        },
        {
          "name": "recipientTokenAccount",
          "docs": [
            "Recipient's token account if using SPL."
          ],
          "writable": true
        },
        {
          "name": "nextRoundState",
          "docs": [
            "Next round state PDA (created if not the last round)."
          ],
          "writable": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        }
      ],
      "args": []
    },
    {
      "name": "initializeGroup",
      "docs": [
        "Creates a new savings group with the given parameters.",
        "Auto-calculates contribution and collateral amounts.",
        "Collects gas reserve and platform fee from the admin."
      ],
      "discriminator": [
        191,
        73,
        34,
        229,
        233,
        213,
        189,
        173
      ],
      "accounts": [
        {
          "name": "admin",
          "docs": [
            "The admin creating the group. Pays for all init costs."
          ],
          "writable": true,
          "signer": true
        },
        {
          "name": "groupState",
          "docs": [
            "The group state PDA."
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  103,
                  114,
                  111,
                  117,
                  112
                ]
              },
              {
                "kind": "account",
                "path": "admin"
              },
              {
                "kind": "arg",
                "path": "name"
              }
            ]
          }
        },
        {
          "name": "vault",
          "docs": [
            "The vault PDA that holds all funds (collateral + contributions)."
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "groupState"
              }
            ]
          }
        },
        {
          "name": "platformWallet",
          "docs": [
            "The platform fee recipient wallet."
          ],
          "writable": true
        },
        {
          "name": "memberState",
          "docs": [
            "Admin's member state PDA."
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  109,
                  101,
                  109,
                  98,
                  101,
                  114
                ]
              },
              {
                "kind": "account",
                "path": "groupState"
              },
              {
                "kind": "account",
                "path": "admin"
              }
            ]
          }
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "name",
          "type": "string"
        },
        {
          "name": "memberCount",
          "type": "u8"
        },
        {
          "name": "payoutAmount",
          "type": "u64"
        },
        {
          "name": "roundInterval",
          "type": "u8"
        },
        {
          "name": "mint",
          "type": {
            "option": "pubkey"
          }
        }
      ]
    },
    {
      "name": "joinGroup",
      "docs": [
        "Joins an existing group by depositing collateral.",
        "The member's rotation position is based on join order."
      ],
      "discriminator": [
        121,
        56,
        199,
        19,
        250,
        70,
        44,
        184
      ],
      "accounts": [
        {
          "name": "member",
          "docs": [
            "The member joining the group."
          ],
          "writable": true,
          "signer": true
        },
        {
          "name": "groupState",
          "docs": [
            "The group to join."
          ],
          "writable": true
        },
        {
          "name": "memberState",
          "docs": [
            "The member state PDA (created on join)."
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  109,
                  101,
                  109,
                  98,
                  101,
                  114
                ]
              },
              {
                "kind": "account",
                "path": "groupState"
              },
              {
                "kind": "account",
                "path": "member"
              }
            ]
          }
        },
        {
          "name": "vault",
          "docs": [
            "The vault PDA that holds collateral."
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "groupState"
              }
            ]
          }
        },
        {
          "name": "platformWallet",
          "docs": [
            "The platform fee recipient wallet."
          ],
          "writable": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": []
    },
    {
      "name": "leaveGroup",
      "docs": [
        "Leaves a group before it starts. Returns collateral."
      ],
      "discriminator": [
        10,
        4,
        125,
        28,
        46,
        23,
        233,
        29
      ],
      "accounts": [
        {
          "name": "member",
          "docs": [
            "The member leaving the group."
          ],
          "writable": true,
          "signer": true
        },
        {
          "name": "groupState",
          "docs": [
            "The group to leave."
          ],
          "writable": true
        },
        {
          "name": "memberState",
          "docs": [
            "The member's state PDA. Will be closed."
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  109,
                  101,
                  109,
                  98,
                  101,
                  114
                ]
              },
              {
                "kind": "account",
                "path": "groupState"
              },
              {
                "kind": "account",
                "path": "member"
              }
            ]
          }
        },
        {
          "name": "vault",
          "docs": [
            "The vault PDA to refund from."
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "groupState"
              }
            ]
          }
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": []
    },
    {
      "name": "refundCollateral",
      "docs": [
        "Refunds remaining collateral to a member after the cycle is complete."
      ],
      "discriminator": [
        200,
        219,
        212,
        225,
        216,
        188,
        155,
        225
      ],
      "accounts": [
        {
          "name": "caller",
          "docs": [
            "The caller (keeper server or anyone). Anyone can trigger refund after completion."
          ],
          "writable": true,
          "signer": true
        },
        {
          "name": "groupState",
          "docs": [
            "The group (must be completed)."
          ]
        },
        {
          "name": "finalRoundState",
          "docs": [
            "The final round state (used to verify completion if status is still Active)."
          ]
        },
        {
          "name": "memberState",
          "docs": [
            "The member state to refund."
          ],
          "writable": true
        },
        {
          "name": "vault",
          "docs": [
            "The vault PDA (source of refund)."
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "groupState"
              }
            ]
          }
        },
        {
          "name": "memberWallet",
          "docs": [
            "The member's wallet (receives refund)."
          ],
          "writable": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": []
    },
    {
      "name": "startCycle",
      "docs": [
        "Starts the cycle once all member slots are filled.",
        "Creates Round 1 with the appropriate deadline."
      ],
      "discriminator": [
        203,
        152,
        115,
        167,
        17,
        252,
        73,
        86
      ],
      "accounts": [
        {
          "name": "caller",
          "docs": [
            "The caller (keeper server or admin). Anyone can call this once the group is full."
          ],
          "writable": true,
          "signer": true
        },
        {
          "name": "groupState",
          "docs": [
            "The group to start."
          ],
          "writable": true
        },
        {
          "name": "roundState",
          "docs": [
            "Round 1 state PDA."
          ],
          "writable": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": []
    },
    {
      "name": "proposeExtension",
      "docs": [
        "Any member can propose to extend the current round's deadline."
      ],
      "discriminator": [
        52,
        87,
        195,
        193,
        21,
        191,
        104,
        79
      ],
      "accounts": [
        {
          "name": "proposer",
          "signer": true,
          "writable": true
        },
        {
          "name": "groupState",
          "writable": true
        },
        {
          "name": "memberState",
          "writable": true
        }
      ],
      "args": [
        {
          "name": "extensionHours",
          "type": "u16"
        }
      ]
    },
    {
      "name": "voteOnExtension",
      "docs": [
        "Votes on an active extension proposal."
      ],
      "discriminator": [
        232,
        232,
        30,
        115,
        220,
        0,
        179,
        87
      ],
      "accounts": [
        {
          "name": "voter",
          "signer": true,
          "writable": true
        },
        {
          "name": "groupState",
          "writable": true
        },
        {
          "name": "roundState",
          "writable": true
        },
        {
          "name": "memberState",
          "writable": true
        }
      ],
      "args": []
    }
  ],
  "accounts": [
    {
      "name": "groupState",
      "discriminator": [
        55,
        178,
        239,
        222,
        83,
        210,
        195,
        67
      ]
    },
    {
      "name": "memberState",
      "discriminator": [
        41,
        28,
        21,
        90,
        91,
        49,
        228,
        104
      ]
    },
    {
      "name": "roundState",
      "discriminator": [
        153,
        242,
        39,
        64,
        102,
        34,
        239,
        11
      ]
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "invalidGroupName",
      "msg": "Group name must be between 1 and 32 characters"
    },
    {
      "code": 6001,
      "name": "invalidMemberCount",
      "msg": "Member count must be between 2 and 20"
    },
    {
      "code": 6002,
      "name": "minPayoutNotMet",
      "msg": "Payout amount does not meet the minimum requirement"
    },
    {
      "code": 6003,
      "name": "payoutNotDivisible",
      "msg": "Payout amount must be perfectly divisible by member count"
    },
    {
      "code": 6004,
      "name": "invalidPayoutAmount",
      "msg": "Invalid payout amount"
    },
    {
      "code": 6005,
      "name": "invalidRoundInterval",
      "msg": "Round interval must be between 0 (Daily) and 3 (Yearly)"
    },
    {
      "code": 6006,
      "name": "groupFull",
      "msg": "Group is already full"
    },
    {
      "code": 6007,
      "name": "groupNotFilling",
      "msg": "Group is not in Filling status"
    },
    {
      "code": 6008,
      "name": "groupNotActive",
      "msg": "Group is not in Active status"
    },
    {
      "code": 6009,
      "name": "groupNotFull",
      "msg": "Group is not full yet"
    },
    {
      "code": 6010,
      "name": "cycleNotCompleted",
      "msg": "Cycle has not completed"
    },
    {
      "code": 6011,
      "name": "alreadyJoined",
      "msg": "Member has already joined this group"
    },
    {
      "code": 6012,
      "name": "insufficientCollateral",
      "msg": "Insufficient lamports for collateral deposit"
    },
    {
      "code": 6013,
      "name": "invalidContributionAmount",
      "msg": "Invalid contribution amount"
    },
    {
      "code": 6014,
      "name": "alreadyContributed",
      "msg": "Member has already contributed this round"
    },
    {
      "code": 6015,
      "name": "gracePeriodNotExpired",
      "msg": "Grace period has not expired yet"
    },
    {
      "code": 6016,
      "name": "contributionsMissing",
      "msg": "Not all contributions have been settled"
    },
    {
      "code": 6017,
      "name": "payoutAlreadySent",
      "msg": "Payout has already been sent for this round"
    },
    {
      "code": 6018,
      "name": "notAMember",
      "msg": "Member is not part of this group"
    },
    {
      "code": 6019,
      "name": "arithmeticOverflow",
      "msg": "Arithmetic overflow"
    },
    {
      "code": 6020,
      "name": "collateralAlreadyRefunded",
      "msg": "Collateral already refunded for this member"
    },
    {
      "code": 6021,
      "name": "roundMismatch",
      "msg": "Round does not match current group round"
    },
    {
      "code": 6022,
      "name": "memberNotDefaulted",
      "msg": "Member has not defaulted this round"
    },
    {
      "code": 6023,
      "name": "cannotLeaveActiveGroup",
      "msg": "Cannot leave group after it has started"
    },
    {
      "code": 6024,
      "name": "notAdmin",
      "msg": "Only admin can delete the group"
    },
    {
      "code": 6025,
      "name": "groupHasMembers",
      "msg": "Cannot delete group with active members. Members must leave first."
    }
  ],
  "types": [
    {
      "name": "groupState",
      "docs": [
        "The state of a savings group."
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "admin",
            "docs": [
              "The admin who created this group."
            ],
            "type": "pubkey"
          },
          {
            "name": "name",
            "docs": [
              "Group name (max 32 characters)."
            ],
            "type": "string"
          },
          {
            "name": "memberCount",
            "docs": [
              "Maximum number of members (2–20). Also equals total rounds."
            ],
            "type": "u8"
          },
          {
            "name": "payoutAmount",
            "docs": [
              "Payout amount in lamports, set by admin."
            ],
            "type": "u64"
          },
          {
            "name": "contributionAmount",
            "docs": [
              "Contribution per member per round (payout / member_count), in lamports."
            ],
            "type": "u64"
          },
          {
            "name": "collateralAmount",
            "docs": [
              "Collateral amount per member (= payout_amount), in lamports."
            ],
            "type": "u64"
          },
          {
            "name": "roundInterval",
            "docs": [
              "Round interval: 0 = weekly (7 days), 1 = monthly (30 days)."
            ],
            "type": "u8"
          },
          {
            "name": "currentRound",
            "docs": [
              "Current round number (1-indexed, 0 = not started)."
            ],
            "type": "u8"
          },
          {
            "name": "members",
            "docs": [
              "Ordered list of member pubkeys (join order = rotation order)."
            ],
            "type": {
              "vec": "pubkey"
            }
          },
          {
            "name": "status",
            "docs": [
              "Current lifecycle status of the group."
            ],
            "type": {
              "defined": {
                "name": "groupStatus"
              }
            }
          },
          {
            "name": "bump",
            "docs": [
              "PDA bump seed."
            ],
            "type": "u8"
          },
          {
            "name": "vaultBump",
            "docs": [
              "Vault PDA bump seed."
            ],
            "type": "u8"
          },
          {
            "name": "mint",
            "docs": [
              "Optional mint for SPL tokens (USDC/USDT). If None, uses SOL."
            ],
            "type": {
              "option": "pubkey"
            }
          },
          {
            "name": "activeProposal",
            "docs": [
              "Governance: Active proposal for deadline extension."
            ],
            "type": {
              "option": {
                "defined": {
                  "name": "proposal"
                }
              }
            }
          }
        ]
      }
    },
    {
      "name": "groupStatus",
      "docs": [
        "Lifecycle status of a group."
      ],
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "filling"
          },
          {
            "name": "active"
          },
          {
            "name": "completed"
          }
        ]
      }
    },
    {
      "name": "memberState",
      "docs": [
        "Per-member state within a group."
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "wallet",
            "docs": [
              "The member's wallet address."
            ],
            "type": "pubkey"
          },
          {
            "name": "group",
            "docs": [
              "The group this member belongs to."
            ],
            "type": "pubkey"
          },
          {
            "name": "collateralBalance",
            "docs": [
              "Remaining collateral balance in lamports.",
              "Starts at payout_amount, decreases with each auto-pull."
            ],
            "type": "u64"
          },
          {
            "name": "rotationPosition",
            "docs": [
              "Position in rotation order (0-indexed)."
            ],
            "type": "u8"
          },
          {
            "name": "joinedAt",
            "docs": [
              "Unix timestamp of when the member joined."
            ],
            "type": "i64"
          },
          {
            "name": "refunded",
            "docs": [
              "Whether collateral has been refunded at cycle end."
            ],
            "type": "bool"
          },
          {
            "name": "bump",
            "docs": [
              "PDA bump seed."
            ],
            "type": "u8"
          },
          {
            "name": "lastVotedProposal",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "roundState",
      "docs": [
        "State for a single round within a cycle."
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "group",
            "docs": [
              "The group this round belongs to."
            ],
            "type": "pubkey"
          },
          {
            "name": "roundNumber",
            "docs": [
              "Round number (1-indexed)."
            ],
            "type": "u8"
          },
          {
            "name": "dueTimestamp",
            "docs": [
              "Unix timestamp when contributions are due."
            ],
            "type": "i64"
          },
          {
            "name": "graceEndTimestamp",
            "docs": [
              "Unix timestamp when grace period ends (due + 24 hours)."
            ],
            "type": "i64"
          },
          {
            "name": "contributionsReceived",
            "docs": [
              "Bitmap of contributions received, indexed by rotation position.",
              "true = member has paid (manually or via auto-pull)."
            ],
            "type": {
              "vec": "bool"
            }
          },
          {
            "name": "payoutSent",
            "docs": [
              "Whether the payout has been sent for this round."
            ],
            "type": "bool"
          },
          {
            "name": "bump",
            "docs": [
              "PDA bump seed."
            ],
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "proposal",
      "docs": [
        "A governance proposal for deadline extension."
      ],
      "type": {
        "kind": "struct",
        "fields": [
          { "name": "targetRound", "type": "u8" },
          { "name": "extensionHours", "type": "u16" },
          { "name": "consensusReached", "type": "bool" },
          { "name": "expiresAt", "type": "i64" },
          { "name": "yesVotes", "type": "u8" }
        ]
      }
    }
  ]
};
