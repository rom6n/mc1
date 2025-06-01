import { Address, beginCell, Cell, Contract, contractAddress, ContractProvider, Sender, SendMode, toNano } from '@ton/core';

export type MyContractConfig = {
    owner_address: Address;
    access: number;
    recent_sender_address: Address;
    message_text: string;
    message_time: number;
};

export function myContractConfigToCell(config: MyContractConfig): Cell {
    return beginCell()
        .storeAddress(config.owner_address)
        .storeUint(config.access, 32)
        .storeAddress(config.recent_sender_address)
        .storeStringTail(config.message_text)
        .storeUint(config.message_time, 32)
        .endCell();
}

export const Opcodes = {
    edit_message: 0x6e1d23c8,
    delete_message: 0x78efd3e0,
    change_access: 0x708be4d1,
    transfer_ownership: 0x295e75a9,
    deposit: 1,
    withdraw: 2,
};

export class MyContract implements Contract {
    constructor(readonly address: Address, readonly init?: { code: Cell; data: Cell }) {}

    static createFromAddress(address: Address) {
        return new MyContract(address);
    }

    static createFromConfig(config: MyContractConfig, code: Cell, workchain = 0) {
        const data = myContractConfigToCell(config);
        const init = { code, data };
        return new MyContract(contractAddress(workchain, init), init);
    }

    async sendDeploy(provider: ContractProvider, via: Sender, value: bigint) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell().endCell(),
        });
    }

    async edit_message(
        provider: ContractProvider,
        via: Sender,
        value: bigint,
        new_message: string,
        queryID?: number,
    ) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell()
                .storeUint(Opcodes.edit_message, 32)
                .storeUint(queryID ?? 0, 64)
                .storeStringTail(new_message)
                .endCell(),
        });
    }

    async delete_message(
        provider: ContractProvider,
        via: Sender,
        value: bigint,
        queryID?: number,
    ) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell()
                .storeUint(Opcodes.delete_message, 32)
                .storeUint(queryID ?? 0, 64)
                .endCell(),
        });
    }

    async change_access(
        provider: ContractProvider,
        via: Sender,
        value: bigint,
        new_access: number,
        queryID?: number,
    ) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell()
                .storeUint(Opcodes.edit_message, 32)
                .storeUint(queryID ?? 0, 64)
                .storeUint(new_access, 32) // 0 - запрещено всем кроме владельца, -1 - разрешено
                .endCell(),
        });
    }

    async transfer_ownership(
        provider: ContractProvider,
        via: Sender,
        value: bigint,
        transfer_to: Address,
        queryID?: number,
    ) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell()
                .storeUint(Opcodes.edit_message, 32)
                .storeUint(queryID ?? 0, 64)
                .storeAddress(transfer_to)
                .endCell(),
        });
    }

    async send_deposit(
        provider: ContractProvider,
        via: Sender,
        value: bigint,
        queryID?: number,
    ) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell()
                .storeUint(Opcodes.edit_message, 32)
                .storeUint(queryID ?? 0, 64)
                .endCell(),
        });
    }

    async send_withdraw(
        provider: ContractProvider,
        via: Sender,
        value: bigint,
        amount: number,
        queryID?: number,
    ) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell()
                .storeUint(Opcodes.edit_message, 32)
                .storeUint(queryID ?? 0, 64)
                .storeCoins(toNano(amount))
                .endCell(),
        });
    }

    async getContractData(provider: ContractProvider) {
        const {stack} = await provider.get('get_contract_data', []);
        return (
            stack.readAddress,
            stack.readNumber,
            stack.readAddress,
            stack.readString,
            stack.readNumber
        )
    }

    async getBalance(provider: ContractProvider) {
        const result = await provider.get('balance', []);
        return result.stack.readBigNumber();
    }
}
