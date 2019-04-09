require('dotenv').config()
const algosdk = require('algosdk');

// Retrieve the token, server and port values {algod,kmd}.net and
// {algod,kmd}.token files within the `data' directory.
const server = `http://${process.env.HOSTNAME}`;
const algodToken = process.env.ALGOD_TOKEN;
const algodPort = process.env.ALGOD_PORT;
const kmdToken = process.env.KMD_TOKEN;
const kmdPort = process.env.KMD_PORT;

const algodClient = new algosdk.Algod(algodToken, server, algodPort);
const kmdClient = new algosdk.Kmd(kmdToken, server, kmdPort);

const showBlock = false;
const createWallet = false;
const backupWallet = false;
const recoverWallet = false;
const sendTx = false;
const findTxAddr = false;
const findTxIter = false;

let walletId = null;
let walletHandle = null;
let txId = "EXQVLGRRARXG5KG5EBZVVJD3GK2GI5S4PET33OKN36S42KD65ZRQ"; // 256761 - Einstein
// let txId = "A6R7R6EL2I4QJRHBSRLE2B4AQ3N74MKRWQZARYCXQOR742HC3NGQ"; // 343498 - Dawkins
let amount = 100;
let addr = "2VXBXLOZSLA5EXPYD3P2SS5ODNUDTMOWTIQPLEU2SZB2Z563IWIXMQKJKI";

(async () => {
    const algodStatus = await algodClient.status();
    console.log(algodStatus);

    // Retrieve the Latest Block's Information
    if (showBlock) {
        const lastround = algodStatus.lastRound;
        const block = await algodClient.block(lastround);
        console.log("\n-----------------Block Information-------------------");
        console.log(block);
    }
})().catch(e => {
    console.log(e);
});

// Creating a New Wallet and Account Using `kmd'
// The following example creates a wallet, and generates an account
// within that wallet using the kmd.
// Created wallet. 895bad84b32bbffa28c2c069d6b49e9f
// Got wallet handle. 7c851f23a5ccf3b9.720b234ca57648b7bde1c1b1557c2be476da621f49bde47e8ddd01e254d7917a
// Created new account. MYPI256EXJQIMTV3NHX2BNVAPL7WRXCOOJ67X4WE536RSUMKEZVSP4IBI4
if (createWallet) {
    (async () => {
        walletId = (await kmdClient.createWallet(process.env.JS_WALLET, process.env.JS_WALLET_PASSWORD, "", "sqlite")).wallet.id;
        console.log("Created wallet.", walletId);

        walletHandle = (await kmdClient.initWalletHandle(walletId, process.env.JS_WALLET_PASSWORD)).wallet_handle_token;
        console.log("Got wallet handle.", walletHandle);

        let address = (await kmdClient.generateKey(walletHandle)).address;
        console.log("Created new account.", address);
    })().catch(e => {
        console.log(e);
    });
}

// Backing Up and Restoring a Wallet
// You can export a master derivation key from the wallet and convert
// it to a mnemonic phrase in order to back up any wallet generated
// accounts. This backup phrase will only allow you to recover
// wallet-generated keys; if you import an external key into a
// kmd-managed wallet, you'll need to back up that key by itself in
// order to recover it.
if (backupWallet) {
    (async () => {
        // Get a list of the wallets and find the one we are looking for
        walletId = null;
        let wallets = (await kmdClient.listWallets()).wallets;
        console.log("List Wallet.", wallets);
        wallets.forEach(function (arrayItem) {
            console.log(arrayItem.name);
            if(arrayItem.name === process.env.JS_WALLET){
                walletId = arrayItem.id;
            }
        });

        // Get a wallet handle
        walletHandle = (await kmdClient.initWalletHandle(walletId, process.env.JS_WALLET_PASSWORD)).wallet_handle_token;
        console.log("Got wallet handle.", walletHandle);
        // Export the master derivation key
        let mdk = (await kmdClient.exportMasterDerivationKey(walletHandle, process.env.JS_WALLET_PASSWORD)).master_derivation_key;
        console.log("mdk.", mdk);
        // Get backup phrase to store offline in a safe place
        console.log(algosdk.masterDerivationKeyToMnemonic(mdk));
    })().catch(e => {
        console.log(e);
    });
}

// Recover a Wallet
// To restore a wallet, convert the phrase to a key and pass it to
// CreateWallet. This call will fail if the wallet already exists.
if (recoverWallet) {
    (async () => {
        // Get the master get from the backup phrase
        let mn = process.env.JS_WALLET_MNEMONIC;
        let mdk =  (await algosdk.mnemonicToMasterDerivationKey(mn));
        console.log(mdk);
        // Create the wallet using the master derivation key
        walletId = (await kmdClient.createWallet(process.env.RECOVERED_WALLET, process.env.RECOVERED_WALLET_PASSWORD, mdk)).wallet.id;;
        console.log(walletId);
        //Get a wallet handle
        walletHandle = (await kmdClient.initWalletHandle(walletId, process.env.RECOVERED_WALLET_PASSWORD)).wallet_handle_token;
        console.log("Got wallet handle.", walletHandle);
        // Generate 1 address. You could generate multiple accounts
        let address = (await kmdClient.generateKey(walletHandle)).address;
        console.log("Created new account.", address);
    })().catch(e => {
        console.log(e.text);
    })
}

// Signing and Submitting a Transaction
// You can use the stand-alone functions to create and sign a
// transaction, but to submit it you will need access to an algod
// process. You will need to use an algod client wrapper function
// to submit it to the network. Up to 1kb of arbitrary data can be
// stored in any transaction. This is done using the note field of the
// transaction. The data must first be encoded and the SDK provides a
// convenience function to do this. The following example creates a
// transaction and encodes an object into the note field.
if (sendTx) {
    // // Create an account
    // const account = algosdk.generateAccount();
    // console.log(account.addr);

    // // Get backup phrase for account
    // const mnemonic = algosdk.secretKeyToMnemonic(account.sk);
    // console.log(mnemonic);

    // Recover the account
    const mnemonic = process.env.JS_WALLET_MNEMONIC;
    const recoveredAccount = algosdk.mnemonicToSecretKey(mnemonic);
    console.log(recoveredAccount.addr);

    // Check to see if account is valid
    const isValid = algosdk.isValidAddress(recoveredAccount.addr);
    console.log("Is this a valid address: " + isValid);

    (async () => {
        // Get the relevant params from the algod
        let params = await algodClient.getTransactionParams();
        let endRound = params.lastRound + parseInt(1000);

        let quote = {
            by: "Richard Dawkins",
            text: "the solution often turns out more beautiful than the puzzle"
        };

        // Create a transaction
        let txn = {
            "from": recoveredAccount.addr,
            "to": "NJY27OQ2ZXK6OWBN44LE4K43TA2AV3DPILPYTHAJAMKIVZDWTEJKZJKO4A",
            "fee": params.fee,
            "amount": amount,
            "firstRound": params.lastRound,
            "lastRound": endRound,
            "genesisID": params.genesisID,
            "note": algosdk.encodeObj(quote),
            //"note": new Uint8Array(0)
        };

        // Sign the transaction
        const signedTxn = algosdk.signTransaction(txn, recoveredAccount.sk);

        // Submit the transaction
        const tx = await algodClient.sendRawTransaction(signedTxn.blob);
        txId = tx.txId;
        console.log("Transaction: " + txId);
    })().catch(e => {
        console.log(e);
    });
}

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
if (findTxAddr) {
    (async () => {
        const tx = await algodClient.transactionInformation(addr, txId);//recoveredAccount.addr, txId);
        console.log("Transaction: " + JSON.stringify(tx));

        // Reading the Note Field of a Transaction
        // Up to 1kb of arbitrary data can be stored in any
        // transaction. This data can be stored and read from the
        // transaction's note field. If this data was encoded using the
        // SDK's `encodeObj' function, then it can be decoded using the
        // `decodeObj' function.
        let encodednote = JSON.stringify(algosdk.decodeObj(tx.note), undefined, 4);
        console.log("Decoded: " + encodednote);
    
        // Iterate across all transactions for a given address and
        // round range, e.g. get all transactions for an address for
        // the last 1000 rounds.
        // const params = await algodClient.getTransactionParams();
        // const txts = await algodClient.transactionByAddress(recoveredAccount.addr, params.lastRound - 1000, params.lastRound);
        // let lastTransaction = txts.transactions[txts.transactions.length - 1];
    })().catch(e => {
        console.log(e.error);
    });
}

// You can also iterate over all the blocks in a given range and search
// for a specific transaction.
if (findTxIter) {
    (async () => {
        const params = await algodClient.getTransactionParams();
        const start = params.lastRound; // 329923; 
        const end = 0;//; params.lastRound - 100; 
        mainloop:
        for (let i = start; i > end; i--){
            let block = await algodClient.block(i);
            // console.log("Number of Transactions in " + i + ": " + block.txns.transactions.length);
            if (typeof block.txns.transactions === "undefined") { continue; }
            let txcn = block.txns.transactions.length;
            for (let j = 0; j < txcn - 1; j++){
                // console.log("Transaction " + block.txns.transactions[j].tx);
                if (block.txns.transactions[j].tx === txId) {
                    if (undefined !== block.txns.transactions[j].note && block.txns.transactions[j].note.length) {
                        let textedJson = JSON.stringify(block.txns.transactions[j], undefined, 4);
                        console.log("Transaction: " + textedJson);
                        let encodednote = JSON.stringify(algosdk.decodeObj(block.txns.transactions[j].note), undefined, 4);
                        console.log("Decoded: " + encodednote);
                        break mainloop;
                    }
                }
            }
        }
    })().catch(e => {
        console.log(e);
    });
}
