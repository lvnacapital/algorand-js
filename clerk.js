/* eslint-disable no-console */
const readlineSync = require('readline-sync');
const algosdk = require('algosdk');

// Signing and Submitting a Transaction
// You can use the stand-alone functions to create and sign a
// transaction, but to submit it you will need access to an algod
// process. You will need to use an algod client wrapper function
// to submit it to the network. Up to 1kb of arbitrary data can be
// stored in any transaction. This is done using the note field of the
// transaction. The data must first be encoded and the SDK provides a
// convenience function to do this. The following example creates a
// transaction and encodes an object into the note field.
function sendTransaction(generateAccount, algodClient, kmdClient) {
    let note = '';
    let amount = 0;
    const from = { addr: '', sk: '' };
    let to = ''; // 'KI6TMKHUQOGJ7EDZLOWFOGHBBWBIMBMKONMS565X7NSOFMAM6S2EK4GBHQ';
    let walletName = '';
    let walletPassword = '';
    let walletId = null;
    let walletHandle = null;
    let txId = '';

    (async () => {
        if (generateAccount) {
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
            const wallets = await kmdClient.listWallets();
            const walletsLength = wallets.wallets.length;
            if (typeof walletsLength !== 'undefined' && walletsLength > 0) {
                console.log('\nGot wallets list:'); // + JSON.stringify(wallets));
                for (let i = 0; i < walletsLength; i++) {
                    console.log(`[${i + 1}] ${wallets.wallets[i].name}`);
                }

                if (!walletName) {
                    const walletIndex = readlineSync.keyIn(
                        `Pick the wallet to use [1${walletsLength > 1 ? `-${walletsLength}` : ''}]: `,
                        // eslint-disable-next-line comma-dangle
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
                    { limit: `$<1-${keysLength}>` },
                );
                from.addr = keys.addresses[keyIndex - 1];
                from.sk = (await kmdClient.exportKey(walletHandle, walletPassword, from.addr)).private_key;
                // console.log('sk', from.sk);
            } else {
                console.log(`No keys could be found in \`kmd' for '${walletName}'.`);
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
        const params = await algodClient.getTransactionParams();
        const endRound = params.lastRound + parseInt(1000, 10);

        // Create a transaction
        const txn = {
            from: from.addr,
            to, // 'NJY27OQ2ZXK6OWBN44LE4K43TA2AV3DPILPYTHAJAMKIVZDWTEJKZJKO4A',
            fee: params.fee,
            amount,
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
        txId = tx.txId; // eslint-disable-line prefer-destructuring
        console.log(`Transaction: tx-${txId}`);
    })().catch((e) => {
        console.log(e.error.text);
        process.exit(1);
    });
}

module.exports = { sendTransaction };
