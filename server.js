require('dotenv').config();
const algosdk = require('algosdk');
const program = require('commander');
const readlineSync = require('readline-sync');

program
    .version('0.0.1', '-v, --version')
    .usage('[options]')
    .option('-b, --show-block', 'Display block information')
    .option('-c, --create-wallet', 'Create new wallet')
    .option('-u, --backup-wallet', 'Backup wallet')
    .option('-r, --recover-wallet', 'Recover a wallet')
    .option('-s, --send-transaction', 'Send a transaction')
    .option('-n, --generate-account', 'Send transaction from newly-generated account (depends on -s)')
    .option('-g, --get-transaction', 'Get a transaction (with address)')
    .option('-f, --find-transaction', 'Get a transaction (with transaction ID)')
    .option('-H, --host <IP>', 'Algorand node hostname/IP')
    .option('-a, --algod-port <ALGOD_PORT>', "Port used by `algod'")
    .option('-t, --algod-token <ALGOD_TOKEN>', "Authorization token for `algod'")
    .option('-k, --kmd-port <KMD_PORT>', "Port used by `kmd'")
    .option('-m, --kmd-token <KMD_TOKEN>', "Authorization token for `kmd'")
    .parse(process.argv);

// Retrieve the token, server and port values {algod,kmd}.net and
// {algod,kmd}.token files within the `data' directory.
const host = process.env.HOSTNAME || program.host || '127.0.0.1';
const server = `http://${host}`;
const algodToken = process.env.ALGOD_TOKEN || program.algodToken;
const algodPort = process.env.ALGOD_PORT || program.algodPort || '8080';
const kmdToken = process.env.KMD_TOKEN || program.algodToken;
const kmdPort = process.env.KMD_PORT || program.kmdPort || '7833';

const algodClient = new algosdk.Algod(algodToken, server, algodPort);
const kmdClient = new algosdk.Kmd(kmdToken, server, kmdPort);

let algodStatus = null;
let walletId = null;
let walletHandle = null;
let txId = '';
let addr = '';
// let txId = 'EXQVLGRRARXG5KG5EBZVVJD3GK2GI5S4PET33OKN36S42KD65ZRQ'; // 256761 - Einstein
// let txId = "A6R7R6EL2I4QJRHBSRLE2B4AQ3N74MKRWQZARYCXQOR742HC3NGQ"; // 343498 - Dawkins
// let addr = '2VXBXLOZSLA5EXPYD3P2SS5ODNUDTMOWTIQPLEU2SZB2Z563IWIXMQKJKI';

(async () => {
    algodStatus = await algodClient.status();
    console.log("`algod' Status\n--------------");
    console.log(`Last committed block: ${algodStatus.lastRound}`);
    console.log(`Time since last block: ${(algodStatus.timeSinceLastRound / 1000000000).toFixed(1)}s`);
    console.log(`Last consensus protocol: ${algodStatus.lastConsensusVersion}`);
    console.log(`Next consensus protocol: ${algodStatus.nextConsensusVersion}`);
    console.log(`Round for next consensus protocol: ${algodStatus.nextConsensusVersionRound}`);
    console.log(`Next consensus protocol supported: ${algodStatus.nextConsensusVersionSupported}\n`);
})().catch((e) => {
    console.log(e.error.text);
    process.exit(1);
});

// Retrieve the Latest Block's Information
if (program.showBlock) {
    const lastround = algodStatus.lastRound;
    (async () => {
        const block = await algodClient.block(lastround);
        console.log('\n-----------------Block Information-------------------');
        console.log(block);
    })().catch((e) => {
        console.log(e.error.text);
        process.exit(1);
    });
}

// Creating a New Wallet and Account Using `kmd'
// The following example creates a wallet, and generates an account
// within that wallet using the kmd.
// Created wallet. 895bad84b32bbffa28c2c069d6b49e9f
// Got wallet handle. 7c851f23a5ccf3b9.720b234ca57648b7bde1c1b1557c2be476da621f49bde47e8ddd01e254d7917a
// Created new account. MYPI256EXJQIMTV3NHX2BNVAPL7WRXCOOJ67X4WE536RSUMKEZVSP4IBI4
else if (program.createWallet) {
    let walletName = process.env.JS_WALLET;
    let walletPassword = process.env.JS_WALLET_PASSWORD;

    if (!walletName) {
        walletName = readlineSync.question('Specify a wallet name [default: JSWallet]: ', { defaultInput: 'JSWallet' });
    }
    if (!walletPassword) {
        walletPassword = readlineSync.question('Specify a wallet password: ', { hideEchoBack: true, mask: '' });
    }
    // console.log(walletName);
    // console.log(walletPassword);

    (async () => {
        // prettier-ignore
        walletId = (await kmdClient.createWallet(process.env.JS_WALLET, process.env.JS_WALLET_PASSWORD, '', 'sqlite')).wallet.id;
        console.log('Created wallet: ', walletId);

        walletHandle = (await kmdClient.initWalletHandle(walletId, process.env.JS_WALLET_PASSWORD)).wallet_handle_token;
        console.log('Got wallet handle: ', walletHandle);

        let address = (await kmdClient.generateKey(walletHandle)).address;
        console.log('Created new account: ', address);
    })().catch((e) => {
        console.log(e.error.text);
        process.exit(1);
    });
}

// Backing Up and Restoring a Wallet
// You can export a master derivation key from the wallet and convert
// it to a mnemonic phrase in order to back up any wallet generated
// accounts. This backup phrase will only allow you to recover
// wallet-generated keys; if you import an external key into a
// kmd-managed wallet, you'll need to back up that key by itself in
// order to recover it.
else if (program.backupWallet) {
    (async () => {
        let walletName = process.env.JS_WALLET;
        let walletPassword = process.env.JS_WALLET_PASSWORD;

        if (!walletName) {
            // prettier-ignore
            walletName = readlineSync.question('Specify a wallet to backup [default: JSWallet]: ', { defaultInput: 'JSWallet' });
        }
        if (!walletPassword) {
            walletPassword = readlineSync.question('Type the wallet password: ', { hideEchoBack: true, mask: '' });
        }
        // console.log(walletName);
        // console.log(walletPassword);

        // Get a list of the wallets and find the one we are looking for
        walletId = null;
        let wallets = (await kmdClient.listWallets()).wallets;
        console.log('List Wallet: ', wallets);
        wallets.forEach(function(arrayItem) {
            console.log(arrayItem.name);
            if (arrayItem.name === walletName) {
                walletId = arrayItem.id;
            }
        });

        // Get a wallet handle
        walletHandle = (await kmdClient.initWalletHandle(walletId, walletPassword)).wallet_handle_token;
        console.log('Got wallet handle: ', walletHandle);

        // Export the master derivation key
        let mdk = (await kmdClient.exportMasterDerivationKey(walletHandle, walletPassword)).master_derivation_key;
        console.log('mdk: ', mdk);

        // Get backup phrase to store offline in a safe place
        console.log(algosdk.masterDerivationKeyToMnemonic(mdk));
    })().catch((e) => {
        console.log(e.error.text);
        process.exit(1);
    });
}

// Recover a Wallet
// To restore a wallet, convert the phrase to a key and pass it to
// CreateWallet. This call will fail if the wallet already exists.
else if (program.recoverWallet) {
    (async () => {
        // Get the master get from the backup phrase
        let mn = process.env.JS_WALLET_MNEMONIC;
        if (!mn) {
            mn = readlineSync.question('Specify the wallet mnemonic: ');
        }
        let mdk = await algosdk.mnemonicToMasterDerivationKey(mn);
        console.log(mdk);

        let walletName = process.env.RECOVERED_WALLET;
        let walletPassword = process.env.RECOVERED_WALLET_PASSWORD;
        if (!walletName) {
            // prettier-ignore
            walletName = readlineSync.question('Specify a recovered wallet name [default: RecoveredWallet]: ', { defaultInput: 'RecoveredWallet' });
        }
        if (!walletPassword) {
            walletPassword = readlineSync.question('Specify a wallet password: ', { hideEchoBack: true, mask: '' });
        }
        // Create the wallet using the master derivation key
        walletId = (await kmdClient.createWallet(walletName, walletPassword, mdk)).wallet.id;
        console.log(walletId);

        // Get a wallet handle
        walletHandle = (await kmdClient.initWalletHandle(walletId, walletPassword)).wallet_handle_token;
        console.log('Got wallet handle: ', walletHandle);

        // Generate 1 address but could generate multiple accounts.
        let address = (await kmdClient.generateKey(walletHandle)).address;
        console.log('Created new account: ', address);
    })().catch((e) => {
        console.log(e.error.text);
        process.exit(1);
    });
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
else if (program.sendTransaction) {
    let note = '';
    let amount = 0;
    let from = { addr: '', sk: '' };
    let to = ''; // 'KI6TMKHUQOGJ7EDZLOWFOGHBBWBIMBMKONMS565X7NSOFMAM6S2EK4GBHQ';
    let walletName = '';
    let walletPassword = 'foobared';

    (async () => {
        if (program.generateAccount) {
            // Create an account
            const account = algosdk.generateAccount();
            console.log(`Address: ${account.addr}`);

            // Get backup phrase for account
            const mnemonic = algosdk.secretKeyToMnemonic(account.sk);
            console.log(`Mnemonic: ${mnemonic}`);

            // Recover the account
            const recoveredAccount = algosdk.mnemonicToSecretKey(mnemonic);
            // console.log(recoveredAccount.addr);

            // Check to see if account is valid
            const isValid = algosdk.isValidAddress(recoveredAccount.addr);
            if (isValid) {
                from.addr = recoveredAccount.addr;
                from.sk = recoveredAccount.sk;
            }
        } else {
            wallets = await kmdClient.listWallets();
            const walletsLength = wallets.wallets.length;
            if (typeof walletsLength !== 'undefined' && walletsLength > 0) {
                console.log('\nGot wallets list:'); // + JSON.stringify(wallets));
                for (let i = 0; i < walletsLength; i++) {
                    console.log(`[${i + 1}] ${wallets.wallets[i].name}`);
                }

                if (!walletName) {
                    const walletIndex = readlineSync.keyIn(
                        `Pick the wallet to use [1${walletsLength > 1 ? `-${walletsLength}` : ''}]: `,
                        { limit: `$<1-${walletsLength}>` }
                    );
                    walletName = wallets.wallets[walletIndex - 1].name;
                    walletId = wallets.wallets[walletIndex - 1].id;
                }

                if (!walletPassword) {
                    walletPassword = readlineSync.question(`\nType the '${walletName}' wallet's password: `, {
                        hideEchoBack: true,
                        mask: '',
                    });
                }

                walletHandle = (await kmdClient.initWalletHandle(walletId, walletPassword)).wallet_handle_token;
            } else {
                console.log("No wallets could be found in `kmd'.");
                process.exit(1);
            }

            const keys = await kmdClient.listKeys(walletHandle);
            const keysLength = keys.addresses.length;
            if (typeof keysLength !== 'undefined' && keysLength > 0) {
                console.log('\nGot keys list:'); // + keys);
                for (let i = 0; i < keysLength; i++) {
                    console.log(`[${i + 1}] ${keys.addresses[i]}`);
                }

                const keyIndex = readlineSync.keyIn(
                    `Pick the account address to send from [1${keysLength > 1 ? `-${keysLength}` : ''}]: `,
                    { limit: `$<1-${keysLength}>` }
                );
                from.addr = keys.addresses[keyIndex - 1];
                from.sk = (await kmdClient.exportKey(walletHandle, walletPassword, from.addr)).private_key;
                // console.log('sk', from.sk);
            } else {
                console.log(`No keys could be found in \`kmd\' for '${walletName}'.`);
                process.exit(1);
            }
        }

        if (!to) {
            to = readlineSync.question('\nSpecify the account address to send to: ');
        }

        if (!amount) {
            amount = readlineSync.questionInt('\nSpecify the amount to be transferred: ');
        }

        if (!note) {
            note = readlineSync.question('\nSpecify some note text (optional): ');
        }

        // Get the relevant params from the algod
        let params = await algodClient.getTransactionParams();
        let endRound = params.lastRound + parseInt(1000);

        // Create a transaction
        let txn = {
            from: from.addr,
            to: to, // 'NJY27OQ2ZXK6OWBN44LE4K43TA2AV3DPILPYTHAJAMKIVZDWTEJKZJKO4A',
            fee: params.fee,
            amount: amount,
            firstRound: params.lastRound,
            lastRound: endRound,
            genesisID: params.genesisID,
            note: note ? algosdk.encodeObj(note) : new Uint8Array(0),
        };

        // Sign the transaction
        console.log('\nSigning transaction: \n', txn);
        const signedTxn = algosdk.signTransaction(txn, from.sk);

        // Submit the transaction
        console.log('\nSubmitting transaction...');
        const tx = await algodClient.sendRawTransaction(signedTxn.blob);
        txId = tx.txId;
        console.log('Transaction: TX-' + txId);
    })().catch((e) => {
        console.log(e.error.text);
        process.exit(1);
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
else if (program.getTransaction) {
    if (!addr) {
        addr = readlineSync.question('\nEnter the sender address to look for: ');
    }
    if (isValidAddress(addr)) {
        console.log(`Not a valid address: ${addr}`);
        process.exit(1);
    }

    if (!txId) {
        txId = readlineSync.question('\nEnter the transaction ID to look for: TX-');
    }

    (async () => {
        const tx = await algodClient.transactionInformation(addr, txId); //recoveredAccount.addr, txId);
        console.log('Transaction: ' + JSON.stringify(tx));

        // Reading the Note Field of a Transaction
        // Up to 1kb of arbitrary data can be stored in any
        // transaction. This data can be stored and read from the
        // transaction's note field. If this data was encoded using the
        // SDK's `encodeObj' function, then it can be decoded using the
        // `decodeObj' function.
        let encodednote = JSON.stringify(algosdk.decodeObj(tx.note), undefined, 4);
        console.log('Decoded: ' + encodednote);

        // Iterate across all transactions for a given address and
        // round range, e.g. get all transactions for an address for
        // the last 1000 rounds.
        // const params = await algodClient.getTransactionParams();
        // const txts = await algodClient.transactionByAddress(recoveredAccount.addr, params.lastRound - 1000, params.lastRound);
        // let lastTransaction = txts.transactions[txts.transactions.length - 1];
    })().catch((e) => {
        console.log(e.error.text);
        process.exit(1);
    });
}

// You can also iterate over all the blocks in a given range and search
// for a specific transaction.
else if (program.findTransaction) {
    if (!txId) {
        txId = readlineSync.question('\nEnter the transaction ID to look for: TX-');
    }

    (async () => {
        const params = await algodClient.getTransactionParams();
        const start = params.lastRound; // 329923;
        const end = params.lastRound - 1000;
        mainloop: for (let i = start; i > end; i--) {
            let block = await algodClient.block(i);
            // console.log("Number of Transactions in " + i + ": " + block.txns.transactions.length);
            if (typeof block.txns.transactions === 'undefined') {
                continue;
            }
            let txcn = block.txns.transactions.length;

            for (let j = 0; j < txcn - 1; j++) {
                // console.log("Transaction " + block.txns.transactions[j].tx);
                if (block.txns.transactions[j].tx === txId) {
                    let textedJson = JSON.stringify(block.txns.transactions[j], undefined, 4);
                    console.log('Transaction: ' + textedJson);
                    if (undefined !== block.txns.transactions[j].note && block.txns.transactions[j].note.length) {
                        // prettier-ignore
                        let encodednote = JSON.stringify(algosdk.decodeObj(block.txns.transactions[j].note), undefined, 4);
                        console.log('Decoded: ' + encodednote);
                    }
                    break mainloop;
                }
            }
        }
    })().catch((e) => {
        console.log(e.error.text);
        process.exit(1);
    });
} else {
    program.outputHelp();
    console.log('');
}
