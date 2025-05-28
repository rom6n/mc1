import { toNano } from '@ton/core';
import { MyContract } from '../wrappers/MyContract';
import { compile, NetworkProvider } from '@ton/blueprint';

export async function run(provider: NetworkProvider) {
    const myContract = provider.open(
        MyContract.createFromConfig(
            {
                id: Math.floor(Math.random() * 10000),
                counter: 0,
            },
            await compile('MyContract')
        )
    );

    await myContract.sendDeploy(provider.sender(), toNano('0.05'));

    await provider.waitForDeploy(myContract.address);

    console.log('ID', await myContract.getID());
}
