async function generateTicketForDraw(gluwaCoin, prizeLinkedAccountVault) {
    const { 0: bondSettings_standardMaturityTerm,
        1: bondSettings_standardInterestRate,
        2: bondSettings_standardInterestRatePercentageBase,
        3: bondSettings_investmentCap,
        4: bondSettings_minimumDeposit } = (await gluwaBondVault.getBondSettings());
    return bondSettings_minimumDeposit;
}

async function getBondAccountState(gluwaBondVault, account) {
    const { 0: bondAccount_idx,
        1: bondAccount_owner,
        2: bondAccount_totalDeposit,
        3: bondAccount_creationDate,
        4: bondAccount_state,
        5: bondAccount_securityReferenceHash } = (await gluwaBondVault.getBondAcountFor(account));
    return bondAccount_state;
}

async function getBondAccountIdx(gluwaBondVault, account) {
    const { 0: bondAccount_idx,
      1: bondAccount_owner,
      2: bondAccount_totalDeposit,
      3: bondAccount_creationDate,
      4: bondAccount_state,
      5: bondAccount_securityReferenceHash } = (await gluwaBondVault.getBondAcountFor(account));
    return bondAccount_idx;
}

async function getBondAccountHashByIdx(gluwaBondVault, account) {
    const bondAccount_idx = getBondAccountIdx(gluwaBondVault, account);
    const bondHash = await gluwaBondVault.getBondAccountHashByIdx(bondAccount_idx);
    return bondHash;
}

async function getBondBalanceState(gluwaBondVault, bondBalanceHash) {
    const { 0: bondBalance_idx,
        1: bondBalance_idxBondAccount,
        2: bondBalance_owner,
        3: bondBalance_interestRate,
        4: bondBalance_interestRatePercentageBase,
        5: bondBalance_yield,
        6: bondBalance_principal,
        7: bondBalance_creationDate,
        8: bondBalance_maturityDate,
        9: bondBalance_state } = (await gluwaBondVault.callStatic.getUserBondBalance(bondBalanceHash));
    return bondBalance_state;
}

module.exports = {generateTicketForDraw, getBondAccountState, getBondAccountIdx, getBondAccountHashByIdx, getBondBalanceState}