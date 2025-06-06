import { Blockchain, SandboxContract, TreasuryContract } from '@ton/sandbox';
import { Address, address, Cell, toNano } from '@ton/core';
import { MyContract } from '../wrappers/MyContract';
import '@ton/test-utils';
import { compile } from '@ton/blueprint';

describe('MyContract', () => {
    let code: Cell;

    beforeAll(async () => {
        code = await compile('MyContract');
    });

    let blockchain: Blockchain;
    let deployer: SandboxContract<TreasuryContract>;
    let myContract: SandboxContract<MyContract>;
    let owner: SandboxContract<TreasuryContract>;

    beforeEach(async () => {
        blockchain = await Blockchain.create();
        owner = await blockchain.treasury("owner");

        myContract = blockchain.openContract(
            MyContract.createFromConfig(
                {
                    owner_address: owner.address,
                    access: 1,
                    recent_sender_address: owner.address,
                    message_text: "INITIAL MESSAGE".toString(),
                    message_time: Date.now(),
                },
                code
            )
        );

        deployer = await blockchain.treasury('deployer');

        const deployResult = await myContract.sendDeploy(deployer.getSender(), toNano('0.05'));

        expect(deployResult.transactions).toHaveTransaction({
            from: deployer.address,
            to: myContract.address,
            deploy: true,
            success: true,
        });

        
    });

    it('should deploy', async () => {
        // the check is done inside beforeEach
        // blockchain and myConract are ready to use
    });

    it('should edit message', async () => {
        let random = Math.floor(Math.random() * 100);
        const sender = await blockchain.treasury("sender")
        const messafe_text = "TEST MESSAAGE 4328479999999999999999999999999999999999999999453258397245876666666666666666666663807592735987897258732840783467893672348765894972349503464634537";
        const messageResult = await myContract.sendMessageEdit(sender.getSender(), toNano(0.05), messafe_text.toString(), random);
        expect(messageResult.transactions).toHaveTransaction({ 
            from: sender.address,
            to: myContract.address,
            success: true,
        });

        const {owner, message, message_time, recent_sender, access} = await myContract.getContractData();
        let current_time = new Date(message_time);
        console.log(`Текущее сообщение после изменения: ${message}\nВремя: ${current_time}`);

    });

    it("should delete message", async () => {
        const sender = await blockchain.treasury("sender");
        const random = Math.floor(Math.random() * 100);

        const messageResult = await myContract.sendMessageEdit(sender.getSender(), toNano(0.05), "TEST MESSAGE".toString(), random);
        expect(messageResult.transactions).toHaveTransaction({
            from: sender.address,
            to: myContract.address,
            success: true,
        });

        const deleteResult = await myContract.sendDeleteMessage(sender.getSender(), toNano(0.05), random);
        expect(deleteResult.transactions).toHaveTransaction({
            from: sender.address,
            to: myContract.address,
            success: true,
        });

        const {owner, message, message_time, recent_sender, access} = await myContract.getContractData();
        console.log(`Текущее сообщение после удаления: ${message}, отправитель: ${recent_sender}`);
    })

    it("should change access", async () => {
        const sender = await blockchain.treasury("sender");
        const random = Math.floor(Math.random() * 100);
        const changeResult = await myContract.sendChangeAccess(owner.getSender(), toNano(0.05), 0, random);
        expect(changeResult.transactions).toHaveTransaction({
            from: owner.address,
            to: myContract.address,
            success: true, 
        });

        const messageResult = await myContract.sendMessageEdit(sender.getSender(), toNano(0.05), "TEST MESSAGE".toString(), random);
        expect(messageResult.transactions).toHaveTransaction({
            from: sender.address,
            to: myContract.address,
            exitCode: 201, 
            success: false,
        });
    })

    it("should change owner", async () => {
        const new_owner = await blockchain.treasury("newOwner");
        const random = Math.floor(Math.random() * 100);
        const changeOwnerResult = await myContract.sendTransferOwnership(owner.getSender(), toNano(0.05), new_owner.address, random);
        expect(changeOwnerResult.transactions).toHaveTransaction({
            from: owner.address,
            to: myContract.address,
            success: true, 
        });

        const dataResult = await myContract.getContractData();
        expect((dataResult.owner).toString({testOnly: true})).toBe((new_owner.address).toString({testOnly: true}));
    })

    it("should withdraw coins", async () => {
        const random = Math.floor(Math.random() * 100);
        const balance_before = await myContract.getBalance();
        const withdrawResult = await myContract.sendWithdraw(owner.getSender(), toNano(0.05), toNano(0.06), random);
        const balance_after = await myContract.getBalance();
        expect(withdrawResult.transactions).toHaveTransaction({
            from: owner.address,
            to: myContract.address,
            success: true,
        });

        expect(balance_before).toBeGreaterThan(balance_after);
    })

    it("should NOT withdraw coins due a lot", async () => {
        const random = Math.floor(Math.random() * 100);
        const withdrawResult = await myContract.sendWithdraw(owner.getSender(), toNano(0.05), toNano(0.1), random);
        expect(withdrawResult.transactions).toHaveTransaction({
            from: owner.address,
            to: myContract.address,
            exitCode: 301,
            success: false,
        });
    })

    it("should NOT withdraw coins due not from owner", async () => {
        const random = Math.floor(Math.random() * 100);
        const sender = await blockchain.treasury("sender");
        const withdrawResult = await myContract.sendWithdraw(sender.getSender(), toNano(0.05), toNano(0.01), random);
        expect(withdrawResult.transactions).toHaveTransaction({
            from: sender.address,
            to: myContract.address,
            exitCode: 206,
            success: false,
        });
    })


});
