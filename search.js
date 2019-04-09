/* eslint-disable no-console, no-labels, no-restricted-syntax, no-continue, no-await-in-loop */
const readlineSync = require('readline-sync');
const algosdk = require('algosdk');

// let txId = '';
// let addr = '';
// let txId = 'EXQVLGRRARXG5KG5EBZVVJD3GK2GI5S4PET33OKN36S42KD65ZRQ'; // 256761 - Einstein
let txId = 'A6R7R6EL2I4QJRHBSRLE2B4AQ3N74MKRWQZARYCXQOR742HC3NGQ'; // 343498 - Dawkins
// let txId = 'XV76DED43IGLBSFVWYD2GNBTWLXCHWPBIMP34H2BWNTK47E3AYIQ'; // dispenser
let addr = '2VXBXLOZSLA5EXPYD3P2SS5ODNUDTMOWTIQPLEU2SZB2Z563IWIXMQKJKI';
// addr = 'MYPI256EXJQIMTV3NHX2BNVAPL7WRXCOOJ67X4WE536RSUMKEZVSP4IBI4';
// addr = 'NJY27OQ2ZXK6OWBN44LE4K43TA2AV3DPILPYTHAJAMKIVZDWTEJKZJKO4A'; // to address

// Locating a Transaction
// Once a transaction is submitted and finalized into a block, it can be
// found later using several methods:
//  - If the node's 'Archival' property is not set to 'true,' only a
//    limited number of local blocks on the node are allowed to be
//    searched. If the 'Archival' property is set to 'true,' the entire
//    blockchain will be available for searching.
//  - Use the account's address with the transaction ID and call the
//    `algod' client's transactionInformation function to find a
//    specific transaction.
function getTransaction(algodClient) {
    console.log('\nFind Transaction from Using Address and Transaction ID');
    console.log('------------------------------------------------------');

    if (!addr) {
        addr = readlineSync.question('Enter the sender address to look for: ');
    }
    if (!algosdk.isValidAddress(addr)) {
        console.log(`Not a valid address: ${addr}`);
        process.exit(1);
    }

    if (!txId) {
        txId = readlineSync.question('\nEnter the transaction ID to look for: tx-');
    }

    (async () => {
        const tx = await algodClient.transactionInformation(addr, txId);
        console.log(`Transaction: ${JSON.stringify(tx)}`);

        // Reading the Note Field of a Transaction
        // Up to 1kb of arbitrary data can be stored in any
        // transaction. This data can be stored and read from the
        // transaction's note field. If this data was encoded using the
        // SDK's `encodeObj' function, then it can be decoded using the
        // `decodeObj' function.
        const encodednote = JSON.stringify(algosdk.decodeObj(tx.note), undefined, 4);
        console.log(`Decoded: ${encodednote}`);

        // // Iterate across all transactions for a given address and
        // // round range.
        // const params = await algodClient.getTransactionParams();
        // const begin = 343496;
        // const end = params.lastRound;
        // const txts = await algodClient.transactionByAddress(addr, begin, end);
        // if (typeof txts !== 'undefined') {
        //     const lastTransaction = txts.transactions[txts.transactions.length - 1];
        //     console.log(`Transaction: ${JSON.stringify(lastTransaction)}`);
        // }
    })().catch((e) => {
        console.log(e.response.error);
    });
}

// You can also iterate over all the blocks in a given range and search
// for a specific transaction.
function findTransaction(algodClient) {
    if (!txId) {
        txId = readlineSync.question('\nEnter the transaction ID to look for: tx-');
    }

    (async () => {
        const params = await algodClient.getTransactionParams();
        const start = params.lastRound;
        const end = 0;
        mainloop: for (let i = start; i > end; i--) {
            const block = await algodClient.block(i);
            // console.log("Number of Transactions in " + i + ": " + block.txns.transactions.length);
            if (typeof block.txns.transactions === 'undefined') {
                continue;
            }
            const txcn = block.txns.transactions.length;

            for (let j = 0; j < txcn - 1; j++) {
                // console.log("Transaction " + block.txns.transactions[j].tx);
                if (block.txns.transactions[j].tx === txId) {
                    const textedJson = JSON.stringify(block.txns.transactions[j], undefined, 4);
                    console.log(`Transaction: ${textedJson}`);
                    if (
                        undefined !== block.txns.transactions[j].note
                        && block.txns.transactions[j].note.length
                    ) {
                        const encodednote = JSON.stringify(
                            algosdk.decodeObj(block.txns.transactions[j].note),
                            undefined,
                            4,
                        );
                        console.log(`Decoded: ${encodednote}`);
                    }
                    break mainloop;
                }
            }
        }
    })().catch((e) => {
        console.log(e.error.text);
        process.exit(1);
    });
}

module.exports = { getTransaction, findTransaction };
