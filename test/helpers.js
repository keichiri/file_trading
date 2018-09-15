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


module.exports = {
    retrieveEvent,
    assertRevert,
};