
class Memory {

    constructor() {
        this.memory = {}
    }

    // Gets a single byte from memory
    getByte(address) {
        address = address >>> 0; 
        if (this.memory[address] === undefined) // If the byte is not defined in the hashMap it means it would be 0x00 in the actual emlated computer
            return 0x00;
        return this.memory[address];
    }

    // Gets a word from memory
    getWord(address) {
        var firstByte = this.getByte(address + 1);

        if(!this.isValidAddress(address))  // Check if the next byte is still in a valid address
            return undefined;

        var secondByte = this.getByte(address);
        return parseInt(secondByte + firstByte, 16);
    }

    // Gets a long-word from memory
    getLong(address) {
        var firstByte = this.getByte(address + 3);
        if(!this.isValidAddress(address + 2)) 
            return undefined;

        var secondByte = this.getByte(address + 2);
        if(!this.isValidAddress(address + 1)) 
            return undefined;

        var thirdByte = this.getByte(address + 1);
        if(!this.isValidAddress(address )) 
            return undefined;

        var fourthByte = this.getByte(address + 0);
        return parseInt(fourthByte+ thirdByte + secondByte + firstByte, 16);
    }

    set(address, value, size) {
        switch(size) {
            case Emulator.CODE_LONG :
                this.setLong(address, value);
                break;
            case Emulator.CODE_WORD :
                this.setWord(address, value);
                break;
            case Emulator.CODE_BYTE :
                this.setByte(address, value);
                break;
        }
    }

    setByte(address, value) {
        address = address >>> 0 ;
        value = value.toString(16).slice(-2); 
        this.memory[address] = value;
    }
    
    setWord(address, value) {
        address = address >>> 0;
        this.setByte(address + 4, value);
        this.setByte(address, value >>> 8);
    }

    setLong(address, value) {
        address = address >>> 0;
        this.setByte(address + 12, value);
        this.setByte(address + 8, value >>> 8);
        this.setByte(address + 4, value >>> 16);
        this.setByte(address + 0, value >>> 24);
    }

    isValidAddress(address) {
        address = address >>> 0;
        return 0 <= address && address <= 0x7fffffff;  /// Address must be between 0 and 0111 1111 1111 1111 1111 1111 1111 1111‬
    }

    printmap() {
        for (var i = 0, keys = Object.keys(memory), ii = keys.length; i < ii; i++) {
            console.log(keys[i] + '|' + memory[keys[i]].list);
          }
    }
}