import { address, toNano } from '@ton/core';
import { MyContract } from '../wrappers/MyContract';
import { compile, NetworkProvider } from '@ton/blueprint';

export async function run(provider: NetworkProvider) {
    const myContract = provider.open(
        MyContract.createFromConfig(
            {
                owner_address: address("0QDU46qYz4rHAJhszrW9w6imF8p4Cw5dS1GpPTcJ9vqNSmnf"),
                access: 1,
                recent_sender_address: address("0QDU46qYz4rHAJhszrW9w6imF8p4Cw5dS1GpPTcJ9vqNSmnf"),
                message_text: "INITIAL MESSAGE".toString(),
                message_time: Date.now(),
            },
            await compile('MyContract')
        )
    );

    await myContract.sendDeploy(provider.sender(), toNano('0.05'));

    await provider.waitForDeploy(myContract.address);

    console.log('Balance: ', await myContract.getBalance());
}
