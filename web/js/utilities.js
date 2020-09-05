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

function UIUpdate(worker) {
    // Re-building registers table
    registers = worker.getRegisters();

    var HTMLRegistri = sprintf("<tr><td>%d</td><td>a%d</td><td>0x%08x</td>", registers[0], 0, registers[0] >>> 0);

    for (i = 1; i < 8; i++) {
        HTMLRegistri += sprintf("<tr><td>%d</td><td>a%d</td><td>0x%08x</td>", registers[i], i, registers[i] >>> 0);
    }

    HTMLRegistri += sprintf("<tr><td>%d</td><td>d%d</td><td>0x%08x</td>", registers[8], 0, registers[8] >>> 0);

    for (i = 9; i < 16; i++) {
        HTMLRegistri += sprintf("<tr><td>%d</td><td>d%d</td><td>0x%08x</td>", registers[i], i - 8, registers[i] >>> 0);
    }
    document.getElementById('registers').innerHTML = HTMLRegistri;
    
    // Setting the text for the last elapsed instruction
    document.getElementById('last_instruction').innerHTML = worker.getLastInstruction();
}

function UIReset() {
    var HTMLRegistri = sprintf("<tr><td>%d</td><td>a%d</td><td>0x%08x</td>", 0, 0, 0 >>> 0);

    for (i = 1; i < 8; i++) {
        HTMLRegistri += sprintf("<tr><td>%d</td><td>a%d</td><td>0x%08x</td>", 0, i, 0 >>> 0);
    }

    HTMLRegistri += sprintf("<tr><td>%d</td><td>d%d</td><td>0x%08x</td>", 0, 0, 0 >>> 0);

    for (i = 9; i < 16; i++) {
        HTMLRegistri += sprintf("<tr><td>%d</td><td>d%d</td><td>0x%08x</td>", 0, i - 8, 0 >>> 0);
    }
    document.getElementById('registers').innerHTML = HTMLRegistri;
    document.getElementById('last_instruction').innerHTML = "L'istruzione più recente verrà mostrata qui!"
}
