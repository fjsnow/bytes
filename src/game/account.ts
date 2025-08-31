import type { Database } from "bun:sqlite";
import type { AppState } from "./state";
import { logger, redactPlayerKey } from "../utils/logger";
import crypto from "crypto";

export const LINKING_TOKEN_DURATION_MS = 5 * 60 * 1000;
export const LINKING_TOKEN_COOLDOWN_MS = 5 * 1000;

export function getOrCreateAccountId(
    db: Database,
    accountKey: string,
): { accountId: number; isNewAccount: boolean } {
    let accountId: number;
    let isNewAccount = false;
    const linkedKeyRow = db
        .query("SELECT account_id FROM linked_keys WHERE pubkey = ?")
        .get(accountKey) as { account_id: number } | undefined;

    if (linkedKeyRow) {
        accountId = linkedKeyRow.account_id;
        logger.info(
            `Found existing account ID for key ${redactPlayerKey(
                accountKey,
            )}: ${accountId}.`,
        );
    } else {
        const insertAccount = db.run(
            "INSERT INTO accounts (progress, settings) VALUES ('{}', '{}')",
        );
        accountId = Number(insertAccount.lastInsertRowid);
        isNewAccount = true;
        logger.info(
            `Assigning new account ID ${accountId} and linking to key ${redactPlayerKey(
                accountKey,
            )}.`,
        );
        db.run("INSERT INTO linked_keys (pubkey, account_id) VALUES (?, ?)", [
            accountKey,
            accountId,
        ]);
        logger.info(`Created initial empty account data for ${accountId}.`);
    }
    return { accountId, isNewAccount };
}

export function getLinkedKeysForAccount(
    db: Database,
    accountId: number,
): string[] {
    const linkedKeysQuery = db.query(
        "SELECT pubkey FROM linked_keys WHERE account_id = ?",
    );
    const linkedKeysRows = linkedKeysQuery.all(accountId) as {
        pubkey: string;
    }[];
    return linkedKeysRows.map((row) => row.pubkey);
}

export async function generateLinkingToken(appState: AppState, db: Database) {
    if (!appState.ssh) {
        logger.warn("Attempted to generate linking token in standalone mode.");
        return;
    }
    const token = crypto.randomBytes(3).toString("hex").toUpperCase();

    appState.ui.settings.linkingToken = token;
    appState.ui.settings.linkingTokenGeneratedAt = Date.now();
    db.run(
        "INSERT OR REPLACE INTO linking_tokens (token, account_id, expires_at) VALUES (?, ?, ?)",
        [token, appState.ssh.accountId, Date.now() + LINKING_TOKEN_DURATION_MS],
    );
}

export function revokeLinkingToken(appState: AppState, db: Database) {
    if (!appState.ssh || !appState.ui.settings.linkingToken) {
        logger.warn(
            "Attempted to revoke non-existent token or in standalone mode.",
        );
        return;
    }
    db.run("DELETE FROM linking_tokens WHERE token = ?", [
        appState.ui.settings.linkingToken,
    ]);
    appState.ui.settings.linkingToken = null;
    logger.info("Linking token revoked.");
}

export function unlinkKey(db: Database, pubkey: string) {
    db.run("DELETE FROM linked_keys WHERE pubkey = ?", [pubkey]);
    logger.info(`Removed linked key ${redactPlayerKey(pubkey)}.`);
}

export function deleteAccountData(db: Database, accountId: number) {
    db.run("DELETE FROM linked_keys WHERE account_id = ?", [accountId]);
    db.run("DELETE FROM linking_tokens WHERE account_id = ?", [accountId]);
    db.run("DELETE FROM accounts WHERE id = ?", [accountId]);
    logger.info(`Account data for ${accountId} has been permanently deleted.`);
}

export function getLinkingTokenData(
    db: Database,
    token: string,
): { account_id: number; expires_at: number } | undefined {
    const tokenQuery = db.query(
        "SELECT account_id, expires_at FROM linking_tokens WHERE token = ?",
    );
    return tokenQuery.get(token) as
        | { account_id: number; expires_at: number }
        | undefined;
}

export function linkKeyToAccount(
    db: Database,
    pubkey: string,
    accountId: number,
) {
    db.run(
        "INSERT OR REPLACE INTO linked_keys (pubkey, account_id) VALUES (?, ?)",
        [pubkey, accountId],
    );
    logger.info(
        `PlayerKey ${redactPlayerKey(pubkey)} successfully linked to account ${accountId}.`,
    );
}

export function countLinkedKeys(db: Database, accountId: number): number {
    const linkedKeysCountQuery = db.query(
        "SELECT COUNT(*) as count FROM linked_keys WHERE account_id = ?",
    );
    const { count } = linkedKeysCountQuery.get(accountId) as {
        count: number;
    };
    return count;
}

export function findLinkedKeyAccount(
    db: Database,
    pubkey: string,
): number | undefined {
    const existingLinkQuery = db.query(
        "SELECT account_id FROM linked_keys WHERE pubkey = ?",
    );
    const existingLink: { account_id: number } | undefined =
        existingLinkQuery.get(pubkey) as any;
    return existingLink?.account_id;
}

export function cleanupExpiredLinkingTokens(db: Database) {
    const deleteQuery = db.query(
        "DELETE FROM linking_tokens WHERE expires_at <= ?",
    );
    const { changes } = deleteQuery.run(Date.now());
    logger.info(`Cleaned up ${changes} expired linking tokens.`);
}
