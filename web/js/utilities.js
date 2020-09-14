function isBranch(operation) {
    var options = ["bra.w", "bra.b", "bsr"];
    return options.some(opt => opt == operation);
}

function isJumpImmediate(operation) {
    var options = ["jmp", "jsr"];
    return options.some(opt => opt == operation);
}

function isNoOPsInstruction(operation) {
    var options = ["rts"];
    return options.some(opt => opt == operation);
}

function areSectionsValid(simhalt, end) {
    return simhalt && end;
}

function eraseWord(register) {
    return register & 0xFFFF0000;
}

function getShiftCeiling(size) {
    switch(size) {
        case Emulator.CODE_BYTE:
            return 0x08;
        case Emulator.CODE_WORD:
            return 0x10;
        case Emulator.CODE_LONG:
            return 0x1F;
    }
}

function getMSBMask(size) {
    switch(size) {
        case Emulator.CODE_BYTE:
            return Emulator.MSB_BYTE_MASK;
        case Emulator.CODE_WORD:
            return Emulator.MSB_WORD_MASK;
        case Emulator.CODE_LONG:
            return Emulator.MSB_LONG_MASK;
    }
}

function sleep(milliseconds) {
    var start = new Date().getTime();
    for (var i = 0; i < 1e7; i++) {
      if ((new Date().getTime() - start) > milliseconds){
        break;
      }
    }
}