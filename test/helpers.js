async function retrieveEvent(tx, eventName) {
    const { logs } = await tx;
    return logs.find(e => e.event === eventName);
}


async function assertRevert(promise) {
    try {
        await promise;
        assert.fail("Did not revert");
    } catch (error) {
        const revertExists = error.message.search("revert") >= 0;
        assert(revertExists, "Did not revert");
    }
}


async function weiGasCost(tx) {
    let actualTx = await web3.eth.getTransaction(tx.tx);
    let gasUsed = web3.toBigNumber(tx.receipt.gasUsed);
    let gasPrice = actualTx.gasPrice;

    return gasUsed.mul(gasPrice);
};


module.exports = {
    retrieveEvent,
    assertRevert,
    weiGasCost,
};