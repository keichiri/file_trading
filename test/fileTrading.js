const FileTrading = artifacts.require("./FileTrading.sol");
const { assertRevert, retrieveEvent } = require("./helpers.js");


function stringToBytes(string) {
    let utf8EncodedString = unescape(encodeURIComponent(string));
    let bytes = [];
    for (let i = 0; i < utf8EncodedString.length; i++) {
        bytes.push(utf8EncodedString.charCodeAt(i));
    }
    return bytes;
}

function assertArrayEqual(array1, array2) {
    assert.equal(array1.length, array2.length);
    for (let i = 0; i < array1.length; i++) {
        assert.equal(array1[i], array2[i]);
    }
}

contract("FileTrading", (accounts) => {
    let owner = accounts[0];
    let offeror1 = accounts[1];
    let offeror2 = accounts[2];
    let buyer1 = accounts[3];
    let buyer2 = accounts[4];
    let buyer3 = accounts[5];
    let fileTrading;
    let fileOfferingFee = web3.toWei('0.1', 'finney');
    // Truffle/Web3 behaves weirdly with bytes type. Resorted to sending string representing hexencoded data-
    let fileName = "0x1234";
    let depositValue = web3.toWei('0.003', 'ether');
    let filePrice = web3.toWei('0.01', 'ether');


    beforeEach(async() => {
        fileTrading = await FileTrading.new(fileOfferingFee, {from: owner});
        assert.ok(fileTrading);
    });

    describe("Constructor", () => {
        it("Sets appropriate file offering fee and owner", async() => {
            let fileTrading = await FileTrading.new(fileOfferingFee, {from: owner});
            assert.ok(fileTrading);

            let retrievedOwner = await fileTrading.owner();
            assert.equal(retrievedOwner, owner);

            let retrievedFee = await fileTrading.fee();
            assert.equal(retrievedFee, fileOfferingFee);
        });
    });

    describe("Creating file offering", () => {
        it("Stores new FileOffering with appropriate offeror", async() => {
            await fileTrading.createFileOffering(fileName, filePrice, depositValue, {from: offeror1, value: fileOfferingFee});

            let fileOffering = await fileTrading.fileOfferings(1);
            assert.equal(fileOffering[0], offeror1);
            assert.equal(fileOffering[1], Buffer(fileName));
            assert.equal(fileOffering[2], filePrice);
            assert.equal(fileOffering[3], depositValue);
        });

        it("Adds file offering's id to list of active ids", async() => {
            let initialIDs = await fileTrading.getActiveFileOfferings();
            assertArrayEqual(initialIDs, []);

            await fileTrading.createFileOffering(fileName, filePrice, depositValue, {from: offeror1, value: fileOfferingFee});

            let currentIDs = await fileTrading.getActiveFileOfferings();
            assertArrayEqual(currentIDs, [1]);
        });

        it("Emits NewFileOffering event", async() => {
            let tx = await fileTrading.createFileOffering(fileName, filePrice, depositValue, {from: offeror1, value: fileOfferingFee});
            let event = await retrieveEvent(tx, "NewFileOffering");

            assert.equal(event.args.id, 1);
            assert.equal(event.args.fileName, Buffer(fileName));
            assert.equal(event.args.offeror, offeror1);
            assert.equal(event.args.price, filePrice);
        });

        it("Reverts if not enough wei was sent", async() => {
            await assertRevert(fileTrading.createFileOffering(fileName, filePrice, depositValue, {from: offeror1, value: fileOfferingFee - 1}));
        });
    });

    describe("Removing file offering", () => {
        beforeEach(async() => {
            await fileTrading.createFileOffering(fileName, filePrice, depositValue, {from: offeror1, value: fileOfferingFee});
        });

        it("Removes file offering id from list of active file offerings", async () => {
            let initialIDs = await fileTrading.getActiveFileOfferings();
            assertArrayEqual(initialIDs, [1]);

            await fileTrading.removeFileOffering(1, {from: offeror1});

             let currentIDs = await fileTrading.getActiveFileOfferings();
             assertArrayEqual(currentIDs, []);
        });

        it("Removes file offering id from list of active file offerings if called by owner", async() => {
            let initialIDs = await fileTrading.getActiveFileOfferings();
            assertArrayEqual(initialIDs, [1]);

            await fileTrading.removeFileOffering(1, {from: owner});

            let currentIDs = await fileTrading.getActiveFileOfferings();
            assertArrayEqual(currentIDs, []);
        });

        it("Emits FileOfferingRemoved event", async() => {
            let tx = await fileTrading.removeFileOffering(1, {from: offeror1});
            let event = await retrieveEvent(tx, "FileOfferingRemoved");

            assert.equal(event.args.id, 1);
            assert.equal(event.args.offeror, offeror1);
            assert.equal(event.args.fileName, fileName);
        });

        it("Reverts if called for nonactive file offering", async() => {
            await fileTrading.removeFileOffering(1, {from: offeror1});
            await assertRevert(fileTrading.removeFileOffering(1, {from: offeror1}));
        });

        it("Reverts if called for too large id", async() => {
            await assertRevert(fileTrading.removeFileOffering(2, {from: offeror1}));
        });

        it("Reverts if called by neither owner nor offeror", async() => {
            await assertRevert(fileTrading.removeFileOffering(1, {from: offeror2}));
        });
    })
});