function UIUpdate(worker, memory_starting_point) {
    // Re-building registers table
    registers = worker.getRegisters();

    var HTMLRegistri = sprintf("<tr><td><input id='%d' class='init-value' type='text' value='%d'></td><td>a%d</td><td>0x%08x</td></tr>", 0, registers[0], 0, registers[0] >>> 0);
    
    for (i = 1; i < 8; i++) {
        HTMLRegistri += sprintf("<tr><td><input id='%d' class='init-value' type='text' value='%d'></td><td>a%d</td><td>0x%08x</td></tr>", i, registers[i], i, registers[i] >>> 0);
    }

    HTMLRegistri += sprintf("<tr><td><input id='%d' class='init-value' type='text' value='%d'></td><td>d%d</td><td>0x%08x</td></tr>", i, registers[8], 0, registers[8] >>> 0);

    for (i = 9; i < 16; i++) {
        HTMLRegistri += sprintf("<tr><td><input id='%d' class='init-value' type='text' value='%d'></td><td>d%d</td><td>0x%08x</td></tr>", i, registers[i], i - 8, registers[i] >>> 0);
    }
    document.getElementById('registers').innerHTML = HTMLRegistri;

    // Re-building memory table
    let number =  parseInt(worker.memory.getByte(memory_starting_point >>> 0), 16);
    var HTMLMemoria = sprintf("<tr><td>0x%08x</td><td>%d</td><td>0x%02x</td><td>%08b</td></tr>", memory_starting_point, number, number, number);

    let loop_starting_position = memory_starting_point + 1;
    let loop_ending_position = memory_starting_point + 10;

    for( i = loop_starting_position; i < loop_ending_position; i++) {
        let number =  parseInt(worker.memory.getByte(i >>> 0), 16);
        HTMLMemoria += sprintf("<tr><td>0x%08x</td><td>%d</td><td>0x%02x</td><td>%08b</td></tr>", i, number, number, number);
    }
    document.getElementById('memory').innerHTML = HTMLMemoria;

    // Setting the text for the last elapsed instruction
    document.getElementById('last_instruction').innerHTML = worker.getLastInstruction();
}

function UIReset() {
    // Clearing registers table
    var HTMLRegistri = sprintf("<tr><td><input id='0' class='init-value' type='text' value='%d'></td><td>a%d</td><td>0x%08x</td></tr>", 0, 0, 0 >>> 0);

    for (i = 1; i < 8; i++) {
        HTMLRegistri += sprintf("<tr><td><input id='%d' class='init-value' type='text' value='%d'></td><td>a%d</td><td>0x%08x</td></tr>", i, 0, i, 0 >>> 0);
    }

    HTMLRegistri += sprintf("<tr><td><input id='%d' class='init-value' type='text' value='%d'></td><td>d%d</td><td>0x%08x</td></tr>", i, 0, 0, 0 >>> 0);

    for (i = 9; i < 16; i++) {
        HTMLRegistri += sprintf("<tr><td><input id='%d' class='init-value' type='text' value='%d'></td><td>d%d</td><td>0x%08x</td></tr>", i, 0, i - 8, 0 >>> 0);
    }
    document.getElementById('registers').innerHTML = HTMLRegistri;

    // Clearing memory table
    var HTMLMemoria = sprintf("<tr><td>0x%08x</td><td>%d</td><td>0x%02x</td><td>%08b</td></tr>", 0, 0, 0 >>> 0, 0 >>> 0);

    for( i = 1; i < 10; i++) {
        HTMLMemoria += sprintf("<tr><td>0x%08x</td><td>%d</td><td>0x%02x</td><td>%08b</td></tr>", i, 0, 0 >>> 0, 0 >>> 0);
    }
    document.getElementById('memory').innerHTML = HTMLMemoria;

    document.getElementById('last_instruction').innerHTML = "L'istruzione più recente verrà mostrata qui!"
}

function initializeRegisters() {
    
    worker.registers[0] = parseInt(document.getElementById("0").value);
    worker.registers[1] = parseInt(document.getElementById("1").value);
    worker.registers[2] = parseInt(document.getElementById("2").value);
    worker.registers[3] = parseInt(document.getElementById("3").value);
    worker.registers[4] = parseInt(document.getElementById("4").value);
    worker.registers[5] = parseInt(document.getElementById("5").value);
    worker.registers[6] = parseInt(document.getElementById("6").value);
    worker.registers[7] = parseInt(document.getElementById("7").value);
    worker.registers[8] = parseInt(document.getElementById("8").value);
    worker.registers[9] = parseInt(document.getElementById("9").value);
    worker.registers[10] = parseInt(document.getElementById("10").value);
    worker.registers[11] = parseInt(document.getElementById("11").value);
    worker.registers[12] = parseInt(document.getElementById("12").value);
    worker.registers[13] = parseInt(document.getElementById("13").value);
    worker.registers[14] = parseInt(document.getElementById("14").value);
    worker.registers[15] = parseInt(document.getElementById("15").value);
}

function registersDownload() {
    var dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(worker.registers));
    var dlAnchorElem = document.getElementById('registerDownload');
    dlAnchorElem.setAttribute("href", dataStr);
    dlAnchorElem.setAttribute("download", "registers.json");
    dlAnchorElem.click();
}

function memoryDownload() {
    var dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(worker.memory.memory));
    var dlAnchorElem = document.getElementById('memoryDownload');
    dlAnchorElem.setAttribute("href", dataStr);
    dlAnchorElem.setAttribute("download", "memory.json");
    dlAnchorElem.click();
}