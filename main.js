/* eslint-disable no-console */
require('dotenv').config();
const program = require('commander');
const algosdk = require('algosdk');
const wallet = require('./wallet');
const search = require('./search');
const clerk = require('./clerk');

program
    .version('0.0.4', '-v, --version')
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

(async () => {
    const algodStatus = await algodClient.status();
    console.log("`algod' Status\n--------------");
    console.log(`Last committed block: ${algodStatus.lastRound}`);
    console.log(`Time since last block: ${(algodStatus.timeSinceLastRound / 1000000000).toFixed(1)}s`);
    console.log(`Last consensus protocol: ${algodStatus.lastConsensusVersion}`);
    console.log(`Next consensus protocol: ${algodStatus.nextConsensusVersion}`);
    console.log(`Round for next consensus protocol: ${algodStatus.nextConsensusVersionRound}`);
    console.log(`Next consensus protocol supported: ${algodStatus.nextConsensusVersionSupported}`);

    // Retrieve the Latest Block's Information
    if (program.showBlock) {
        const lastround = algodStatus.lastRound;
        const block = await algodClient.block(lastround);
        console.log('\n-----------------Block Information-------------------');
        console.log(block);
        process.exit(0);
    } else if (program.createWallet) {
        wallet.createWallet(kmdClient);
    } else if (program.backupWallet) {
        wallet.backupWallet(kmdClient);
    } else if (program.recoverWallet) {
        wallet.recoverWallet(kmdClient);
    } else if (program.sendTransaction) {
        clerk.sendTransaction(program.generateAccount, algodClient, kmdClient);
    } else if (program.getTransaction) {
        search.getTransaction(algodClient);
    } else if (program.findTransaction) {
        search.findTransaction(algodClient);
    } else {
        program.outputHelp();
        console.log('');
    }
})().catch((e) => {
    console.log(e);
    process.exit(1);
});
