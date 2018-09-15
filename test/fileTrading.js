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

    describe("Creating FileOffering", () => {
        it("Stores new FileOffering with appropriate offeror", async() => {
            await fileTrading.createFileOffering(fileName, filePrice, {from: offeror1, value: fileOfferingFee});

            let fileOffering = await fileTrading.fileOfferings(1);
            assert.equal(fileOffering[0], offeror1);
            assert.equal(fileOffering[1], Buffer(fileName));
            assert.equal(fileOffering[2], filePrice);
        });

        it("Emits NewFileOffering event", async() => {
            let tx = await fileTrading.createFileOffering(fileName, filePrice, {from: offeror1, value: fileOfferingFee});
            let event = await retrieveEvent(tx, "NewFileOffering");

            assert.equal(event.args.id, 1);
            assert.equal(event.args.fileName, Buffer(fileName));
            assert.equal(event.args.offeror, offeror1);
            assert.equal(event.args.price, filePrice);
        });

        it("Reverts if not enough wei was sent", async() => {
            await assertRevert(fileTrading.createFileOffering(fileName, filePrice, {from: offeror1, value: fileOfferingFee - 1}));
        });
    })
});