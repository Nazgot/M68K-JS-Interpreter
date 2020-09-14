class Emulator {

    // Constants
    // Tokens
    static get TOKEN_IMMEDIATE() {return 0};
    static get TOKEN_OFFSET() {return 1};
    static get TOKEN_REG_ADDR() {return 2};
    static get TOKEN_REG_DATA() {return 3};
    static get TOKEN_OFFSET_ADDR() {return 4};

    // Instruction sizes codes
    static get CODE_LONG() {return 2};
    static get CODE_WORD() {return 1};
    static get CODE_BYTE() {return 0};

    // Instruction sizes in bits
    static get SIZE_LONG() {return 32};
    static get SIZE_WORD() {return 16};
    static get SIZE_BYTE() {return 8};

    // Masks
    static get BYTE_MASK() {return 0x000000FF};
    static get WORD_MASK() {return 0x0000FFFF};
    static get LONG_MASK() {return 0xFFFFFFFF};
    static get MSB_BYTE_MASK() {return 0x80};
    static get MSB_WORD_MASK() {return 0x8000};
    static get MSB_LONG_MASK() {return 0x80000000};

    static get DC_REGEX() {return /^[_a-zA-Z][_a-zA-Z0-9]*\:\s+dc\.[wbl]\s+("[a-zA-Z0-9]+"|([0-9]+,)*[0-9]+)$/gm };
    
    constructor(program) {

        this.pc = 0x0;
        this.line = 0;
        this.ccr = 0x00;
        this.registers = new Int32Array(16);
        this.memory = new Memory();
        this.labels = {};
        this.endPointer = undefined;
        this.simhaltPointer = undefined;
        this.lastInstruction;

        // If instructions is undefined then the instructions are empty
        this.instructions = program || ""; 

        // Splitting the program code into lines and removing whitespaces
        this.instructions = this.instructions.split('\n').map(function(instruction) {
            return instruction.trim();
        });

        // Cloning the instructions for error reports and last instructions utility
        this.cloned_instructions = [...this.instructions];

        // PRE-PROCESSING
        // Removing comments from the program
        this.removeComments();
        // Assigning labels pointers
        this.findLabels();
        // Checking if SIMHALT and END directives are defined
        if(!areSectionsValid(this.endPointer, this.simhaltPointer)){
            //TODO error no SIMHALT or END directives found
            console.log("Missing SIMHALT or END");
            return;
        }
        // Adding jump to START after reching END for the first time section
        this.addJumpToStart();
        // Setting program counter to the start of data initialization section
        this.pc = this.simhaltPointer[0] << 2;
        
        //this.debug();
    }

    debug() {
        console.log("----------------------------------------");
        console.log(this.memory.printmap());
        console.log("----------------------------------------");
    }

    /* GET AND SET */

    getRegisters() {
        return this.registers;
    }

    getMemory() {
        return this.memory;
    }
    
    getLastInstruction() {
        return this.lastInstruction;
    }

    removeComments() {
        var uncommentedProgram = [];

        for(var i = 0; i < this.instructions.length; ++i) {
            var instruction = this.instructions[i];
            // If we find a comment (starting with *), we replace the line with ''
            if(instruction.indexOf('*') != -1) 
                instruction = instruction.substring(0, instruction.indexOf('*')).trim();
            // Ignoring empty lines and comments
            if(instruction != '') {
                // Saving both the instruction and it's original line number for debug purposes
                uncommentedProgram.push([instruction, i + 1]);
            }
                
        }
        this.instructions = uncommentedProgram;
    }

    findLabels() {
        var length = this.instructions.length;
        for(var i = length - 1; i >= 0; --i) {

            var instruction = this.instructions[i][0];

            // Looking for END and SIMHALT 
            if(instruction.toLowerCase() == "simhalt") {
                this.simhaltPointer = [i + 1, this.instructions[i][1]]; 
                this.instructions[i][2] = true;
                continue;
            }

            if(instruction.toLowerCase() == "end") {
                this.endPointer = [i + 1, this.instructions[i][1]]; // Only used as proof that END exists, will be updated later
                // Removing all lines after END directive
                this.instructions.splice(i + 1, this.instructions.length - i);
                this.instructions[i][2] = true;
                continue;
            }

            // If a label is captured (ends with ':')
            if(instruction.charAt(instruction.length -1 ) == ':') { 
                var label = instruction.substring(0, instruction.indexOf(':'));
                // If the label is repeated an error is thrown 
                if(this.labels[label] !== undefined) {
                    //TODO: error propagation
                    continue;
                }

                // The label point to the label itself              
                this.labels[label] = i;
                this.instructions[i][2] = true;
                continue;
            }

            // Checking if the current instruction is a DC.X
            var res = Emulator.DC_REGEX.exec(instruction);
            // If it is a DC.X
            if(res != null) {

                // We extract the label
                var label = instruction.substring(0, instruction.indexOf(':'));

                // If it is a duplicate label we raise an error and continue
                if(this.labels[label] !== undefined) {
                    //TODO: error propagation
                    continue;
                }
                
                // We extract the instruction (DC.X <string> OR DC.X <data list>)
                var tmp = instruction.substring(instruction.indexOf(':') + 1, instruction.length - 1).trim();

                var size = this.parseOpSize(tmp);
                var isString = false;
                isString = tmp.indexOf('"') != -1;

                // If the instruction has a data list
                if(!isString) {
                    tmp = tmp.split(' ');
                    tmp = tmp[1].split(',');

                    var list;
                    switch(size) {
                        case Emulator.CODE_LONG:
                            list = new Int32Array(tmp.length);
                            break;
                        case Emulator.CODE_WORD:
                            list = new Int16Array(tmp.length);
                            break;
                        case Emulator.CODE_BYTE:
                            list = new Int8Array(tmp.length);
                            break;
                        default:
                            break;
                    }    

                    for(var k = 0; k <= tmp.length; k++) 
                        list[k] = parseInt(tmp[k]);
                    

                    this.labels[label] = i;
                    this.instructions[i] = [label + ":", i + 1, true];
                    // For each element of the data list
                    for(var t = 0, j = i + 1; t < tmp.length; j++, t++) {
                        // We splice the element in pushing the following lines forward
                        this.instructions.splice(j, 0, [list[t], i + 1, true]) ;                                              
                    }
                    
                    continue;
                }

                // if the instruction has a string 
                else {
                    tmp = tmp.split(' ');
                    tmp = tmp[1].replace(/"/g, '');
                    this.labels[label] = i;
                    this.instructions[i] = [label + ":", i + 1, true];
                    this.instructions.splice(i + 1, 0, [tmp, i + 1, true]);
                    continue;
                }
               
            } else {
                //TODO : syntax error
                continue;
            }
        }

        // Linking labels to memory
        for(var i = 0; i < this.instructions.length; ++i) { 

            // Skipping labels and data stored in instruction space with DC
            if(this.instructions[i][2])
                continue;
            var instruction = this.instructions[i][0];

            // If the instruction is well written
            if(instruction.indexOf(' ') != -1) {
                // I get the operation of the instruction
                var operation = instruction.substring(0, instruction.indexOf(' ')).trim().toLowerCase();
                // I get the operands of the instruction
                var operands = instruction.substring(instruction.indexOf(' ') + 1, instruction.length).split(',');

                // If the current instruction is an immediate jump or a branch
                if(isJumpImmediate(operation) || isBranch(operation)) {
                    // We get the argoument of the jump (label)
                    var label = operands[operands.length - 1].trim();
                    // We check if the label actually exists
                    if(this.labels[label] !== undefined) 
                        operands[operands.length - 1] = (this.labels[label] - i) << 2; // Relative jump, 2 bit left shift (X4) to preserve alignment
                    else if(isNaN(parseInt(label))) {
                            //TODO: Raise unknown label error
                            // Jumping to the end
                            operands[operands.length - 1] = 0x2ffffff << 2;
                        }
                    // Now the instruction will be replaced with the instruction without the label
                    this.instructions[i][0] = operation + " " + operands.join(',');
                }                 
            }            
        }
    }

    addJumpToStart() {
        // 2 bit left shift for pc alignment, this is a relative jump
        this.endPointer = this.instructions.length - 1 ;
        this.instructions.splice(this.endPointer, 0, ["jmp " + ((-this.endPointer - 1 ) << 2).toString(), undefined]); // 2 bit left shift for pc alignment, this is a relative jump
    }

    parseOpSize(instruction) {
        
        if(instruction.indexOf('.') != -1) {
            // We get the char after the . (if any)
            var size = instruction.charAt(instruction.indexOf('.') + 1);
            switch(size.toLowerCase()) {
                case 'b':
                    return Emulator.CODE_BYTE;
                case 'w': 
                    return Emulator.CODE_WORD;
                case 'l': 
                    return Emulator.CODE_LONG;
            }
            // TODO: If we didn't return from switch we raise an invalid op size error
            return undefined;
        }
        else {
            // If we do not specify a size we use WORD as default
            return Emulator.CODE_WORD; 
        }
    }

    parseRegisters(register) {
        switch(register) {
            case "a0":
                return 0;
            case "a1":
                return 1;
            case "a2":
                return 2;
            case "a3":
                return 3;
            case "a4":
                return 4;
            case "a5":
                return 5;
            case "a6":
                return 6;
            case "a7":
            case "sp":
                return 7;
            case "d0":
                return 8;
            case "d1":
                return 9; 
            case "d2":
                return 10; 
            case "d3":
                return 11; 
            case "d4":
                return 12; 
            case "d5":
                return 13; 
            case "d6":
                return 14; 
            case "d7":
                return 15;                
        }
        
        // TODO: If we do not return from the switch we raise a wrong register error
        return undefined;
    }

    // Return an object containing the value and the type of the token
    parseOperand(token) {
        var res = {
            value: 0,
            type: 0,
            offset: undefined
        };

        token = token.trim();
        // We check if we have an offset-ed address register as an operand
        if(token.indexOf('(') != -1 && token.indexOf(')') != -1) { 
            
            if(token.indexOf('-') != -1) {
                // Isolating and parsing the token inside () recursively
                let result = this.parseOperand(token.substring(token.indexOf('(') + 1, token.indexOf(')')));
                if(result == undefined || result.type == Emulator.TOKEN_REG_DATA) {
                    //TODO: error unvalid address token
                    return undefined;
                }
                res.value = result.value;
                res.type = Emulator.TOKEN_OFFSET_ADDR;
                res.offset = -0x1;
                return res;
            }
            if(token.indexOf('+') != -1) {
                // Isolating and parsing the token inside () recursively
                let result = this.parseOperand(token.substring(token.indexOf('(') + 1, token.indexOf(')')));
                if(result == undefined || result.type == Emulator.TOKEN_REG_DATA) {
                    //TODO: error unvalid address token
                    return undefined;
                }
                res.value = result.value ;
                res.type = Emulator.TOKEN_OFFSET_ADDR;
                res.offset = 0x1;
                return res;
            }
            if(token.charAt(0) == '(') {
                // Isolating and parsing the token inside () recursively
                let result = this.parseOperand(token.substring(token.indexOf('(') + 1, token.indexOf(')')));
                if(result == undefined || result.type == Emulator.TOKEN_REG_DATA) {
                    //TODO: error unvalid address token
                    return undefined;
                }
                res.value = result.value;
                res.type = Emulator.TOKEN_OFFSET_ADDR;
                res.offset = 0x0;
                return res;
            } 
            // Isolating the offset
            res.offset = "0x" + token.substring(token.indexOf('$') + 1, token.indexOf('('));
            // Isolating and parsing the token inside () recursively
            let result = this.parseOperand(token.substring(token.indexOf('(') + 1, token.indexOf(')')));
            // Checking if the token inside () is valid
            if(result == undefined || result.type == Emulator.TOKEN_REG_DATA) {
                //TODO: error unvalid address token
                return undefined;
            }
            res.value = result.value;
            res.type = Emulator.TOKEN_OFFSET_ADDR;
            return res;
        }

        // We check if the token is a register
        if(token.charAt(0) == 'a') {
            res.value = this.parseRegisters(token);
            res.type = Emulator.TOKEN_REG_ADDR;
            return res;
        } 
        if (token.charAt(0) == 'd') {
            res.value = this.parseRegisters(token);
            res.type = Emulator.TOKEN_REG_DATA;
            return res;
        }

        // We check if the token is an immediate
        if(token.charAt(0) == '#') {
            if(token.charAt(1) == '$') {
                res.value = parseInt("0x" + token.substring(2, token.length));
                res.type = Emulator.TOKEN_IMMEDIATE;
                return res;
            }
            else if(token.charAt(1) == '%') {
                res.value = parseInt(token.substring(2, token.length), 2);
                res.type = Emulator.TOKEN_IMMEDIATE;
                return res;
            } else {
                res.value = parseInt(token.substring(1, token.length));
                res.type = Emulator.TOKEN_IMMEDIATE;
                return res;
            }           
        }

        // We check if the token is an offset
        if(token.charAt(0) == '$') {
            res.value = token.substring(1, token.length);
            res.type = Emulator.TOKEN_OFFSET;
            return res;
        }

        // TODO: error
        return undefined;
    }
    
    // Returns true if the program counter is aligned and not < = 0
    checkPC(pc) {       
        return (0 <= pc / 4 && pc % 4 == 0);
    }

    emulationStep() {
        
        // If we reached the end of instructions or we reached the .data section again the program is ended
        if( this.pc / 4 >= this.instructions.length || this.pc / 4 == this.simhaltPointer[0] - 1) {
            console.log("Program ended");
            return true;
        }
        
        // If the program counter is invalid we stop the execution of the program
        if(!this.checkPC(this.pc)) {
            //TODO error invalid program counter
            return;
        }

        var instruction = this.instructions[this.pc / 4][0];
        var flag = this.instructions[this.pc / 4][2];
        this.line = this.instructions[this.pc / 4][1];
        this.pc = this.pc + 4;

        // If the instruction is a label, skip it
        if(flag === true) {
            console.log("skipping label");
            return;
        }

        // Checking if the instruction is an instruction that doesn't require operators
        var noOPS = isNoOPsInstruction(instruction);

        // If the instruction is well formatted
        if(instruction.indexOf(' ') != -1 || noOPS ) {
            var operation;
             
            
            if(!noOPS) {
                // We check if the instruction has a specified size
                if(instruction.indexOf('.') != -1) 
                    operation = instruction.substring(0, instruction.indexOf('.')).trim();
                else
                    operation = instruction.substring(0, instruction.indexOf(' ')).trim();

                var operands = instruction.substring(instruction.indexOf(' ') + 1, instruction.length).split(',');
                var size = this.parseOpSize(instruction);
            } else 
                operation = instruction;
            
            switch(operation.toLowerCase()) {
                case "add":
                    if(operands.length != 2) {
                        // TODO: Error
                        break;
                    }
                    this.add(size,this.parseOperand(operands[0]), this.parseOperand(operands[1]), false);
                    break;
                case "addi":
                    if(operands.length != 2) {
                        // TODO: Error
                        break;
                    }
                    this.addi(size,this.parseOperand(operands[0]), this.parseOperand(operands[1]), false);
                    break;
                case "adda":
                    if(operands.length != 2) {
                        // TODO: Error
                        break;
                    }
                    this.adda(size,this.parseOperand(operands[0]), this.parseOperand(operands[1]), false);
                    break;
                case "move":
                    if(operands.length != 2) {
                        // TODO: Error
                        break;
                    }
                    this.move(size,this.parseOperand(operands[0]), this.parseOperand(operands[1]));
                    break;
                case "movea":
                    if(operands.length != 2) {
                        // TODO: Error
                        break;
                    }
                    this.movea(size,this.parseOperand(operands[0]), this.parseOperand(operands[1]));
                    break;
                case "sub":
                    if(operands.length != 2) {
                        // TODO: Error
                        break;
                    }
                    this.sub(size,this.parseOperand(operands[0]), this.parseOperand(operands[1]));
                    break;
                case "subi":
                    if(operands.length != 2) {
                        // TODO: Error
                        break;
                    }
                    this.subi(size,this.parseOperand(operands[0]), this.parseOperand(operands[1]));
                    break;
                case "suba":
                    if(operands.length != 2) {
                        // TODO: Error
                        break;
                    }
                    this.subi(size,this.parseOperand(operands[0]), this.parseOperand(operands[1]));
                    break;
                case "mulu":
                    if(operands.length != 2) {
                        // TODO: Error
                        break;
                    }
                    this.mulu(size, this.parseOperand(operands[0]), this.parseOperand(operands[1]));
                    break;
                case "muls":
                    if(operands.length != 2) {
                        // TODO: Error
                        break;
                    }
                    this.muls(size, this.parseOperand(operands[0]), this.parseOperand(operands[1]));
                    break;
                case "swap":
                    if(operands.length != 1) {
                        // TODO: Error
                        break;
                    }
                    this.swap(this.parseOperand(operands[0]));
                    break;
                case "exg":
                    if(operands.length != 2) {
                        // TODO: Error
                        break;
                    }
                    this.exg(this.parseOperand(operands[0]), this.parseOperand(operands[1]));
                    break;
                case "clr":
                    if(operands.length != 1) {
                        // TODO: Error
                        break;
                    }
                    this.clr(size, this.parseOperand(operands[0]));
                    break;
                case "not":
                    if(operands.length != 1) {
                        // TODO: Error
                        break;
                    }
                    this.not(size, this.parseOperand(operands[0]));
                    break;
                case "and":
                    if(operands.length != 2) {
                        // TODO: Error
                        break;
                    }
                    this.and(size, this.parseOperand(operands[0]), this.parseOperand(operands[1]));
                    break;
                case "andi":
                    if(operands.length != 2) {
                        // TODO: Error
                        break;
                    }
                    this.andi(size, this.parseOperand(operands[0]), this.parseOperand(operands[1]));
                    break;
                case "or":
                    if(operands.length != 2) {
                        // TODO: Error
                        break;
                    }
                    this.or(size, this.parseOperand(operands[0]), this.parseOperand(operands[1]));
                    break;
                case "ori":
                    if(operands.length != 2) {
                        // TODO: Error
                        break;
                    }
                    this.ori(size, this.parseOperand(operands[0]), this.parseOperand(operands[1]));
                    break;
                case "eor":
                    if(operands.length != 2) {
                        // TODO: Error
                        break;
                    }
                    this.eor(size, this.parseOperand(operands[0]), this.parseOperand(operands[1]));
                    break;
                case "eori":
                    if(operands.length != 2) {
                        // TODO: Error
                        break;
                    }
                    this.eori(size, this.parseOperand(operands[0]), this.parseOperand(operands[1]));
                    break;
                case "neg":
                    if(operands.length != 1) {
                        // TODO: Error
                        break;
                    }
                    this.neg(size, this.parseOperand(operands[0]));
                    break;
                case "ext":
                    if(operands.length != 1) {
                        // TODO: Error
                        break;
                    }
                    this.ext(size, this.parseOperand(operands[0]));
                    break;
                case "lsl":
                    if(operands.length != 2) {
                        // TODO: Error
                        break;
                    }
                    this.llrShifts(size, this.parseOperand(operands[0]), this.parseOperand(operands[1]), false);
                    break;
                case "lsr":
                    if(operands.length != 2) {
                        // TODO: Error
                        break;
                    }
                    this.llrShifts(size, this.parseOperand(operands[0]), this.parseOperand(operands[1]), true);
                    break;
                case "asl":
                    if(operands.length != 2) {
                        // TODO: Error
                        break;
                    }
                    this.alrShifts(size, this.parseOperand(operands[0]), this.parseOperand(operands[1]), false);
                    break;
                case "asr":
                    if(operands.length != 2) {
                        // TODO: Error
                        break;
                    }
                    this.alrShifts(size, this.parseOperand(operands[0]), this.parseOperand(operands[1]), true);
                    break;
                case "rol": 
                    if(operands.length != 2) {
                        // TODO: Error
                        break;
                    }
                    this.lrRotations(size, this.parseOperand(operands[0]), this.parseOperand(operands[1]), false);
                    break;
                case "ror": 
                    if(operands.length != 2) {
                        // TODO: Error
                        break;
                    }
                    this.lrRotations(size, this.parseOperand(operands[0]), this.parseOperand(operands[1]), true);
                    break;
                case "cmp":
                    if(operands.length != 2) {
                        // TODO: Error
                        break;
                    }
                    this.cmp(size, this.parseOperand(operands[0]), this.parseOperand(operands[1]));
                    break;
                case "cmpa":
                    if(operands.length != 2) {
                        // TODO: Error
                        break;
                    }
                    this.cmpa(size, this.parseOperand(operands[0]), this.parseOperand(operands[1]));
                    break;
                case "cmpi":
                    if(operands.length != 2) {
                        // TODO: Error
                        break;
                    }
                    this.cmpi(size, this.parseOperand(operands[0]), this.parseOperand(operands[1]));
                    break;
                case "tst":
                    if(operands.length != 1) {
                        // TODO: Error
                        break;
                    }
                    this.tst(size, this.parseOperand(operands[0]));
                    break;
                case "jmp":
                    if(operands.length != 1) {
                        // TODO: Error
                        break;
                    }
                    this.jmp(operands[0]);
                    break;
                case "jsr":
                    if(operands.length != 1) {
                        // TODO: Error
                        break;
                    }
                    this.jsr(operands[0]);
                    break;
                case "rts":
                    this.rts();
                    break;
                case "bra":
                    if(operands.length != 1) {
                        // TODO: Error
                        break;
                    }
                    this.bra(size, operands[0]);
                    break;
                case "bsr":
                    if(operands.length != 1) {
                        // TODO: Error
                        break;
                    }
                    this.bsr(size, operands[0]);
                    break;
                case "beq":
                    if(operands.length != 1) {
                        // TODO: Error
                        break;
                    }
                    this.beq(size, operands[0]);
                    break;
                case "bne":
                    if(operands.length != 1) {
                        // TODO: Error
                        break;
                    }
                    this.beq(size, operands[0]);
                    break;
                case "bge":
                    if(operands.length != 1) {
                        // TODO: Error
                        break;
                    }
                    this.bge(size, operands[0]);
                    break;
                case "bgt":
                    if(operands.length != 1) {
                        // TODO: Error
                        break;
                    }
                    this.bgt(size, operands[0]);
                    break;
                case "ble":
                    if(operands.length != 1) {
                        // TODO: Error
                        break;
                    }
                    this.ble(size, operands[0]);
                    break;
                case "blt":
                    if(operands.length != 1) {
                        // TODO: Error
                        break;
                    }
                    this.blt(size, operands[0]);
                    break;
                default:
                    console.log("Unrecognised instruction at line " + this.line);
                    // TODO: raise error
                    return;               
            }
            this.lastInstruction = this.cloned_instructions[this.instructions[this.pc / 4][1] - 1];
        }
    }

    // Adds the value of the source operand to the destination operand
    // Can't do memory to memory add
    add(size, op1, op2, is_sub) {
        if(op1 == undefined || op2 == undefined) {
            // TODO : error
            return undefined;
        }

        switch(op1.type.toString() + op2.type.toString()) {
            
            case Emulator.TOKEN_REG_ADDR.toString() + Emulator.TOKEN_REG_ADDR.toString() :
            case Emulator.TOKEN_OFFSET_ADDR.toString() + Emulator.TOKEN_OFFSET_ADDR.toString() :
                //TODO: error can't do memory to memory add
                break;

            case Emulator.TOKEN_REG_ADDR.toString() + Emulator.TOKEN_REG_DATA.toString() : 

                var res , src = this.registers[op1.value];
                res = addOP(src, this.registers[op2.value], this.ccr, size, is_sub);
                this.registers[op2.value] = res[0];
                this.ccr = res[1];
                break;

            // Example: add.w d0, $5
            case Emulator.TOKEN_REG_DATA.toString() + Emulator.TOKEN_OFFSET.toString():

                var address = parseInt(op2.value);
                if(!this.memory.isValidAddress(address)) {
                    //TODO: error non valid address
                    return undefined;
                }

                var res , src = this.registers[op1.value];
                res = addOP(src, this.memory.getLong(address), this.ccr, size, is_sub);
                this.memory.set(address, res[0], size);
                this.ccr = res[1];
                break;
            
            // Example add.w $5, d0
            case Emulator.TOKEN_OFFSET.toString() + Emulator.TOKEN_REG_DATA.toString() : 

                var address = parseInt(op1.value);
                
                if(!this.memory.isValidAddress(address)) {
                    //TODO: error non valid address
                    return undefined;
                }

                var res , src = this.memory.getLong(address);
                res = addOP(src, this.registers[op2.value], this.ccr, size, is_sub);
                this.registers[op2.value] = res[0];
                this.ccr = res[1];
                break;
                       
            // Example: add.w (a0), d0 || add.w $10(a0), d0 || TODO: add.w (a0)+, d0
            case Emulator.TOKEN_OFFSET_ADDR.toString() + Emulator.TOKEN_REG_DATA.toString() :

                var address = parseInt(this.registers[op1.value], 16) + parseInt(op1.offset);
                if(!this.memory.isValidAddress(address)) {
                    //TODO: error non valid address
                    return undefined;
                }
                var res , src = this.memory.getLong(address);
                res = addOP(src, this.registers[op2.value], this.ccr, size ,is_sub);
                this.registers[op2.value] = res[0];
                this.ccr = res[1];
                break;
            
            // Example: add.w d0, (a0)   ||  add.w d0, $10(a0) ||  TODO: add.w d0, -(a0)
            case Emulator.TOKEN_REG_DATA.toString() + Emulator.TOKEN_OFFSET_ADDR.toString() :

                var address = parseInt(this.registers[op2.value], 16) + parseInt(op2.offset);
                if(!this.memory.isValidAddress(address)) {
                    //TODO: error non valid address
                    return undefined;
                }

                var res , src = this.registers[op1.value];
                res = addOP(src, this.memory.getLong(address), this.ccr, size, is_sub);
                this.memory.set(address, res[0], size);
                this.ccr = res[1];
                break;

            // Example : add.w d0, d1
            case Emulator.TOKEN_REG_DATA.toString() + Emulator.TOKEN_REG_DATA.toString() :

                var res , src = this.registers[op1.value];
                res = addOP(src, this.registers[op2.value], this.ccr, size, is_sub);
                this.registers[op2.value] = res[0];
                this.ccr = res[1];
                break;
        }
    }

    // Adds an immediate value to the destination operand
    // Source must be an immediate
    addi(size, op1, op2, is_sub) {
        if(op1 == undefined || op2 == undefined) {
            // TODO : error
            return undefined;
        }
        
        switch(op1.type.toString() + op2.type.toString()) {

            // Example: addi.w #$1234, $5
            case Emulator.TOKEN_IMMEDIATE.toString() + Emulator.TOKEN_OFFSET.toString() :

                var address = parseInt(op2.value);

                if(!this.memory.isValidAddress(address)) {
                    //TODO: error non valid address
                    return undefined;
                }

                var res , src = parseInt(op1.value);
                res = addOP(src, this.memory.getLong(address), this.ccr, size, is_sub);
                this.memory.set(address, res[0], size);
                this.ccr = res[1];
                break;

            // Example: addi.w #$1234, (a0)
            case Emulator.TOKEN_IMMEDIATE.toString() + Emulator.TOKEN_OFFSET_ADDR.toString() :

                var address = parseInt(this.registers[op2.value], 16) + parseInt(op2.offset);
                if(!this.memory.isValidAddress(address)) {
                    //TODO: error non valid address
                    return undefined;
                }

                var res , src = parseInt(op1.value);
                res = addOP(src, this.memory.getLong(address), this.ccr, size, is_sub);
                this.memory.set(address, res[0], size);
                this.ccr = res[1];
                break;

            // Example: addi.w #$1234, d0
            case Emulator.TOKEN_IMMEDIATE.toString() + Emulator.TOKEN_REG_DATA.toString() :
                var res , src = parseInt(op1.value);
                res = addOP(src, this.registers[op2.value], this.ccr, size, is_sub);
                this.registers[op2.value] = res[0];
                this.ccr = res[1];
                break;
        }
    }

    // Adds the value of the source operand to the destination operand, 
    // the destination MUST be an address register
    adda(size, op1, op2, is_sub) {
        switch(op1.type.toString() + op2.type.toString()) {
           
            // Example: adda.w a0, a1 || adda.w d0, a1
            case Emulator.TOKEN_REG_DATA.toString() + Emulator.TOKEN_REG_ADDR.toString() :
            case Emulator.TOKEN_REG_ADDR.toString() + Emulator.TOKEN_REG_ADDR.toString() :

                var res , src = this.registers[op1.value];
                res = addOP(src, this.registers[op2.value], this.ccr, size, is_sub);
                this.registers[op2.value] = res[0];
                this.ccr = res[1];
                break;

            // Example: adda.w $5, a1
            case Emulator.TOKEN_OFFSET.toString() + Emulator.TOKEN_REG_ADDR.toString() :

                var address = parseInt(op1.value);

                if(!this.memory.isValidAddress(address)) {
                    //TODO: error non valid address
                    return undefined;
                }

                var res, src = this.memory.getLong(address);
                res = addOP(src, this.registers[op2.value], this.ccr, size, is_sub);
                this.registers[op2.value] = res[0];
                this.ccr = res[1];
                break;

            // Example adda.l (a0), a1 || adda.l $10(a0), a1
            case Emulator.TOKEN_OFFSET_ADDR.toString() + Emulator.TOKEN_REG_ADDR.toString() :

                var address = parseInt(this.registers[op1.value], 16) + parseInt(op1.offset);
                if(!this.memory.isValidAddress(address)) {
                    //TODO: error non valid address
                    return undefined;
                }
                
                var res, src = this.memory.getLong(address);
                res = addOP(src, this.registers[op2.value], this.ccr, size, is_sub);
                this.registers[op2.value] = res[0];
                this.ccr = res[1];
                break;


            // Example adda.b #$AB, a0
            case Emulator.TOKEN_IMMEDIATE.toString() + Emulator.TOKEN_REG_ADDR.toString() :

                var res , src = parseInt(op1.value);
                res = addOP(src, this.registers[op2.value], this.ccr, size, is_sub);
                this.registers[op2.value] = res[0];
                this.ccr = res[1];
                break;
        }
    }

    // Moves the a value inside a register or memory location
    // Sources : dx, ax, (ax), imm, imm_address
    // Destination : dx, (ax), imm_address
    move(size, op1, op2) {
        
        switch(op1.type.toString() + op2.type.toString()) {

            case Emulator.TOKEN_REG_DATA.toString() + Emulator.TOKEN_REG_DATA.toString() :
            case Emulator.TOKEN_REG_ADDR.toString() + Emulator.TOKEN_REG_DATA.toString() :

                var res = moveOP(this.registers[op1.value], this.registers[op2.value], this.ccr, size);
                this.registers[op2.value] = res[0];
                this.ccr = res[1];
                break;

            case Emulator.TOKEN_IMMEDIATE.toString() + Emulator.TOKEN_REG_DATA.toString() :

                var res = moveOP(parseInt(op1.value), this.registers[op2.value], this.ccr, size);
                this.registers[op2.value] = res[0];
                this.ccr = res[1];
                break;

            case Emulator.TOKEN_OFFSET.toString() + Emulator.TOKEN_REG_DATA.toString() :

                var address = op1.value;
                
                if(!this.memory.isValidAddress(address)) {
                    //TODO: error non valid address
                    return undefined;
                }

                var res = moveOP(this.memory.getLong(address), this.registers[op2.value], this.ccr, size);
                this.registers[op2.value] = res[0];
                this.ccr = res[1];
                break;

            case Emulator.TOKEN_OFFSET_ADDR.toString() + Emulator.TOKEN_REG_DATA.toString() :

                var address = parseInt(this.registers[op1.value], 16) + parseInt(op1.offset);
                if(!this.memory.isValidAddress(address)) {
                    //TODO: error non valid address
                    return undefined;
                }

                var res = moveOP(this.memory.getLong(address), this.registers[op2.value], this.ccr, size);
                this.registers[op2.value] = res[0];
                this.ccr = res[1];
                break;

            case Emulator.TOKEN_REG_DATA.toString() + Emulator.TOKEN_OFFSET.toString():
            case Emulator.TOKEN_REG_ADDR.toString() + Emulator.TOKEN_OFFSET.toString():

                var address = parseInt(op2.value);
                if(!this.memory.isValidAddress(address)) {
                    //TODO: error non valid address
                    return undefined;
                }
                var res = moveOP(this.registers[op1.value], this.memory.getLong(address), this.ccr, size);
                this.memory.set(address, res[0], size);
                this.ccr = res[1];
                break;

            case Emulator.TOKEN_IMMEDIATE.toString() + Emulator.TOKEN_OFFSET.toString():
                var address = parseInt(op2.value);
                
                if(!this.memory.isValidAddress(address)) {
                    //TODO: error non valid address
                    return undefined;
                }

                var res = moveOP(parseInt(op1.value), this.memory.getLong(address), this.ccr, size);
                this.memory.set(address, res[0], size);
                this.ccr = res[1];
                break;

            case Emulator.TOKEN_REG_ADDR.toString() + Emulator.TOKEN_OFFSET_ADDR.toString():
            case Emulator.TOKEN_REG_DATA.toString() + Emulator.TOKEN_OFFSET_ADDR.toString():

                var address = parseInt(this.registers[op2.value], 16) + parseInt(op2.offset);
                if(!this.memory.isValidAddress(address)) {
                    //TODO: error non valid address
                    return undefined;
                }

                var res = moveOP(this.registers[op1.value], this.memory.getLong(address), this.ccr, size);
                this.memory.set(address, res[0], size);
                this.ccr = res[1];
                break;
            
            case Emulator.TOKEN_IMMEDIATE.toString() + Emulator.TOKEN_OFFSET_ADDR.toString():

                var address = parseInt(this.registers[op2.value], 16) + parseInt(op2.offset);
                if(!this.memory.isValidAddress(address)) {
                    //TODO: error non valid address
                    return undefined;
                }
                
                var res = moveOP(parseInt(op1.value), this.memory.getLong(address), this.ccr, size);
                this.memory.set(address, res[0], size);
                this.ccr = res[1];
                break;
        }
    }

    // Moves an address inside an address regiser
    // Source: dx, ax, (ax), imm, imm_address
    // Destination: ax
    // Does not affect CCR
    movea(size, op1, op2) {
        
        switch(op1.type.toString() + op2.type.toString()) {

            case Emulator.TOKEN_REG_DATA.toString() + Emulator.TOKEN_REG_ADDR.toString() :
            case Emulator.TOKEN_REG_ADDR.toString() + Emulator.TOKEN_REG_ADDR.toString() :
                switch(size) {
                    case Emulator.CODE_LONG:
                        this.registers[op2.value] = this.registers[op1.value]; 
                        break;
                    case Emulator.CODE_WORD:
                        console.log(addWord(this.registers[op1.value], this.registers[op2.value] & 0xFFFF0000)[0].toString(16));
                        this.registers[op2.value] = 0xFFFF0000 + addWord(this.registers[op1.value], this.registers[op2.value] & 0xFFFF0000)[0]; // Force a longword type
                        break;
                }
                break;
            case Emulator.TOKEN_IMMEDIATE.toString() + Emulator.TOKEN_REG_ADDR.toString():
                switch(size) {
                    case Emulator.CODE_LONG:
                        this.registers[op2.value] = parseInt(op1.value);
                        break;
                    case Emulator.CODE_WORD:
                        this.registers[op2.value] = 0xFFFF0000 + addWord(parseInt(op1.value), this.registers[op2.value] & 0xFFFF0000)[0]; // Force a longword type
                        break;
                }
                break;
            case Emulator.TOKEN_OFFSET.toString() + Emulator.TOKEN_REG_ADDR.toString() :
                var address = parseInt(op1.value);
                
                if(!this.memory.isValidAddress(address)) {
                    //TODO: error non valid address
                    return undefined;
                }
                switch(size) {
                    case Emulator.CODE_LONG:
                        this.registers[op2.value] = this.memory.getLong(address);
                        break;
                    case Emulator.CODE_WORD: 
                        this.registers[op2.value] = 0xFFFF0000 + addWord(this.memory.getWord(address), this.registers[op2.value] & 0xFFFF0000)[0]; // Force a longword type
                        break;
                }
                break;
            case Emulator.TOKEN_OFFSET_ADDR.toString() + Emulator.TOKEN_REG_ADDR.toString() :
                var address = parseInt(this.registers[op1.value], 16) + parseInt(op1.offset);
                if(!this.memory.isValidAddress(address)) {
                    //TODO: error non valid address
                    return undefined;
                }
                switch(size) {
                    case Emulator.CODE_LONG:
                        this.registers[op2.value] = this.memory.getLong(address);
                        break;
                    case Emulator.CODE_WORD: 
                        this.registers[op2.value] = 0xFFFF0000 + addWord(this.memory.getWord(address), this.registers[op2.value] & 0xFFFF0000)[0]; // Force a longword type
                        break;
                }
            break;
        }
    }

    // Subtracts the value of the source operand from the destination operand
    // Can't do memory to memory sub
    sub(size, op1, op2) {
        this.add(size, op1, op2, true);
    }

    // Subtracts an immediate value from the destination operand
    // Source must be an immediate
    subi(size, op1, op2) {
        this.addi(size, op1, op2, true);
    } 

    // Subtracts the value of the source operand from the destination operand, 
    // The destination MUST be an address register
    suba(size, op1, op2) {
        this.adda(size, op1, op2, true);
    }

    // Swaps the upper word with the lower word of a data register
    swap(op) {
        if(op.type != Emulator.TOKEN_REG_DATA) {
            // ERROR: can only swap a data register 
            return;
        }
        var res = swapOP(this.registers[op.value], this.ccr);
        this.registers[op.value] = res[0];
        this.ccr = res[1];
    }

    // Swaps the content of a register with the content of another register
    exg(op1, op2) {
        if((op1.type != Emulator.TOKEN_REG_DATA && op1.type != Emulator.TOKEN_REG_ADDR) || (op2.type != Emulator.TOKEN_REG_DATA && op2.type != Emulator.TOKEN_REG_ADDR)) {
                // ERROR, can only exg data - data , address-address, data - address, address - data;
                return;
        }
        var res = exgOP(this.registers[op1.value], this.registers[op2.value]);
        this.registers[op1.value] = res[0];
        this.registers[op2.value] = res[1];       
    }

    // Sets to 0 a word, byte , or long-word of the operand
    // Can't clr an address register
    clr(size, op) {
        switch(op.type) {
            case Emulator.TOKEN_REG_DATA :
                var res = clrOP(size, this.registers[op.value], this.ccr);
                this.registers[op.value] = res[0];
                this.ccr = res[1];
                break;
            case Emulator.TOKEN_OFFSET :

                var address = parseInt(op.value);
                if(!this.memory.isValidAddress(address)) {
                    //TODO: error non valid address
                    return undefined;
                }
                res = clrOP(size, this.memory.getLong(address), this.ccr);
                this.memory.set(address, res[0], size);
                this.ccr = res[1];
                break;
            case Emulator.TOKEN_OFFSET_ADDR :

                var address = parseInt(this.registers[op.value], 16) + parseInt(op.offset);
                if(!this.memory.isValidAddress(address)) {
                    //TODO: error non valid address
                    return undefined;
                }
                res = clrOP(size, this.memory.getLong(address), this.ccr);
                this.memory.set(address, res[0], size);
                this.ccr = res[1];
                break;
            default :
                // Error can't clr an address register
                break;
        }
    }

    // Reverses bits of the destination oprand
    not(size, op) {
        switch(op.type) {
            case Emulator.TOKEN_REG_DATA :
                var res = notOP(size, this.registers[op.value], this.ccr);
                this.registers[op.value] = res[0];
                this.ccr = res[1];
                break;
            case Emulator.TOKEN_OFFSET :

                var address = parseInt(op.value);
                if(!this.memory.isValidAddress(address)) {
                    //TODO: error non valid address
                    return undefined;
                }
                res = notOP(size, this.memory.getLong(address), this.ccr);
                this.memory.set(address, res[0], size);
                this.ccr = res[1];
                break;
            case Emulator.TOKEN_OFFSET_ADDR :

                var address = parseInt(this.registers[op.value], 16) + parseInt(op.offset);
                if(!this.memory.isValidAddress(address)) {
                    //TODO: error non valid address
                    return undefined;
                }
                res = notOP(size, this.memory.getLong(address), this.ccr);
                this.memory.set(address, res[0], size);
                this.ccr = res[1];
                break;
            default :
                // Error can't clr an address register
                break;
        }
    }

    // Bitwise and of the two operands, the result is stored in the destination operand
    // Can't do memory to memory and
    // Can't use address registers as source or destination
    and(size, op1, op2) {
        console.log(size, op1, op2)
        switch(op1.type.toString() + op2.type.toString()) {
            
            case Emulator.TOKEN_REG_ADDR.toString() + Emulator.TOKEN_REG_ADDR.toString() :
            case Emulator.TOKEN_OFFSET_ADDR.toString() + Emulator.TOKEN_OFFSET_ADDR.toString() :
                //TODO: error can't do memory to memory and
                break;

            case Emulator.TOKEN_REG_DATA.toString() + Emulator.TOKEN_OFFSET.toString():

                var address = parseInt(op2.value);
                if(!this.memory.isValidAddress(address)) {
                    //TODO: error non valid address
                    return undefined;
                }
                var res = andOP(size, this.registers[op1.value], this.memory.getLong(address), this.ccr);
                this.memory.set(address, res[0], size);
                this.ccr = res[1];
                break;

            case Emulator.TOKEN_OFFSET.toString() + Emulator.TOKEN_REG_DATA.toString():

                var address = parseInt(op1.value);
                if(!this.memory.isValidAddress(address)) {
                    //TODO: error non valid address
                    return undefined;
                }
                res = andOP(size, this.memory.getLong(address), this.registers[op2.value], this.ccr);
                this.registers[op2.value] = res[0];
                this.ccr = res[1];
                break;

            case Emulator.TOKEN_OFFSET_ADDR.toString() + Emulator.TOKEN_REG_DATA.toString() :
                var address = parseInt(this.registers[op1.value], 16) + parseInt(op.offset);
                if(!this.memory.isValidAddress(address)) {
                    //TODO: error non valid address
                    return undefined;
                }
                res = andOP(size, this.memory.getLong(address), this.registers[op2.value], this.ccr);
                this.registers[op2.value] = res[0];
                this.ccr = res[1];
                break;

            case Emulator.TOKEN_REG_DATA.toString() + Emulator.TOKEN_OFFSET_ADDR.toString() :
                var address = parseInt(this.registers[op2.value], 16) + parseInt(op2.offset);
                if(!this.memory.isValidAddress(address)) {
                    //TODO: error non valid address
                    return undefined;
                }
                res = andOP(size, this.registers[op1.value], this.memory.getLong(address), this.ccr);
                this.memory.set(address, res[0], size);
                this.ccr = res[1];
                break;

            case Emulator.TOKEN_REG_DATA.toString() + Emulator.TOKEN_REG_DATA.toString() :

                res = andOP(size, this.registers[op1.value], this.registers[op2.value], this.ccr);
                this.registers[op2.value] = res[0];
                this.ccr = res[1];
                break;

        }
    }

    // Bitwise and of the two operands, the result is stored in the destination operand
    // The first operand must be an immediate value
    // Can't use address registers as destination operands
    andi(size, op1, op2) {
        switch(op1.type.toString() + op2.type.toString()) {
            case Emulator.TOKEN_IMMEDIATE.toString() + Emulator.TOKEN_OFFSET.toString():

                var address = parseInt(op2.value);
                if(!this.memory.isValidAddress(address)) {
                    //TODO: error non valid address
                    return undefined;
                }
                var res = andOP(size, parseInt(op1.value), this.memory.getLong(address), this.ccr);
                this.memory.set(address, res[0] , size);
                this.ccr = res[1];
                break;

            case Emulator.TOKEN_IMMEDIATE.toString() + Emulator.TOKEN_OFFSET_ADDR.toString():

                var address = parseInt(this.registers[op2.value], 16) + parseInt(op2.offset);
                if(!this.memory.isValidAddress(address)) {
                    //TODO: error non valid address
                    return undefined;
                }
                res = andOP(size, parseInt(op1.value), this.memory.getLong(address), this.ccr);
                this.memory.set(address, res[0] , size);
                this.ccr = res[1];
                break;
                
            case Emulator.TOKEN_IMMEDIATE.toString() + Emulator.TOKEN_REG_DATA.toString():

                res = andOP(size, parseInt(op1.value), this.registers[op2.value], this.ccr);
                this.registers[op2.value] = res[0];
                this.ccr = res[1];
                break;
        }
    }
       
    // Bitwise or of the two operands, the result is stored in the destination operand
    // Can't do memory to memory or
    // Can't use address registers as source or destination
    or(size, op1, op2) {
        
        switch(op1.type.toString() + op2.type.toString()) {
            
            case Emulator.TOKEN_REG_ADDR.toString() + Emulator.TOKEN_REG_ADDR.toString() :
            case Emulator.TOKEN_OFFSET_ADDR.toString() + Emulator.TOKEN_OFFSET_ADDR.toString() :
                //TODO: error can't do memory to memory add
                break;

            case Emulator.TOKEN_REG_DATA.toString() + Emulator.TOKEN_OFFSET.toString():

                var address = parseInt(op2.value);
                if(!this.memory.isValidAddress(address)) {
                    //TODO: error non valid address
                    return undefined;
                }
                var res = orOP(size, this.registers[op1.value], this.memory.getLong(address), this.ccr);
                this.memory.set(address, res[0], size);
                this.ccr = res[1];
                break;

            case Emulator.TOKEN_OFFSET.toString() + Emulator.TOKEN_REG_DATA.toString():

                var address = parseInt(op1.value);
                if(!this.memory.isValidAddress(address)) {
                    //TODO: error non valid address
                    return undefined;
                }
                res = orOP(size, this.memory.getLong(address), this.registers[op2.value], this.ccr);
                this.registers[op2.value] = res[0];
                this.ccr = res[1];
                break;

            case Emulator.TOKEN_OFFSET_ADDR.toString() + Emulator.TOKEN_REG_DATA.toString() :

                var address = parseInt(this.registers[op1.value], 16) + parseInt(op.offset);
                if(!this.memory.isValidAddress(address)) {
                    //TODO: error non valid address
                    return undefined;
                }
                res = orOP(size, this.memory.getLong(address), this.registers[op2.value], this.ccr);
                this.registers[op2.value] = res[0];
                this.ccr = res[1];
                break;

            case Emulator.TOKEN_REG_DATA.toString() + Emulator.TOKEN_OFFSET_ADDR.toString() :
                var address = parseInt(this.registers[op2.value], 16) + parseInt(op2.offset);
                if(!this.memory.isValidAddress(address)) {
                    //TODO: error non valid address
                    return undefined;
                }
                res = orOP(size, this.registers[op1.value], this.memory.getLong(address), this.ccr);
                this.memory.set(address, res[0], size);
                this.ccr = res[1];
                break;

            case Emulator.TOKEN_REG_DATA.toString() + Emulator.TOKEN_REG_DATA.toString() :

                res = orOP(size, this.registers[op1.value], this.registers[op2.value], this.ccr);
                this.registers[op2.value] = res[0];
                this.ccr = res[1];
                break;

        }
    }

    // Bitwise or of the two operands, the result is stored in the destination operand
    // The first operand must be an immediate value
    // Can't use address registers as destination operands
    ori(size, op1, op2) {
        switch(op1.type.toString() + op2.type.toString()) {
            case Emulator.TOKEN_IMMEDIATE.toString() + Emulator.TOKEN_OFFSET.toString():

                var address = parseInt(op2.value);
                if(!this.memory.isValidAddress(address)) {
                    //TODO: error non valid address
                    return undefined;
                }
                var res = orOP(size, parseInt(op1.value), this.memory.getLong(address), this.ccr);
                this.memory.set(address, res[0], size);
                this.ccr = res[1];
                break;

            case Emulator.TOKEN_IMMEDIATE.toString() + Emulator.TOKEN_OFFSET_ADDR.toString():

                var address = parseInt(this.registers[op2.value], 16) + parseInt(op2.offset);
                if(!this.memory.isValidAddress(address)) {
                    //TODO: error non valid address
                    return undefined;
                }
                res = orOP(size, parseInt(op1.value), this.memory.getLong(address), this.ccr);
                this.memory.set(address, res[0], size);
                this.ccr = res[1];
                break;
                
            case Emulator.TOKEN_IMMEDIATE.toString() + Emulator.TOKEN_REG_DATA.toString():

                res = orOP(size, parseInt(op1.value), this.registers[op2.value], this.ccr);
                this.registers[op2.value] = res[0];
                this.ccr = res[1];
                break;
        }
    }

    // Bitwise xor of the two operands, the result is stored in the destination operand
    // Can't do memory to memory eor
    // Can't use address registers as source or destination 
    // Can't use memory as source
    eor(size, op1, op2) {
        
        switch(op1.type.toString() + op2.type.toString()) {
            
            case Emulator.TOKEN_REG_ADDR.toString() + Emulator.TOKEN_REG_ADDR.toString() :
            case Emulator.TOKEN_OFFSET_ADDR.toString() + Emulator.TOKEN_OFFSET_ADDR.toString() :
                //TODO: error can't do memory to memory add
                break;

            case Emulator.TOKEN_REG_DATA.toString() + Emulator.TOKEN_OFFSET.toString():

                var address = parseInt(op2.value);
                if(!this.memory.isValidAddress(address)) {
                    //TODO: error non valid address
                    return undefined;
                }
                var res = eorOP(size, this.registers[op1.value], this.memory.getLong(address), this.ccr);
                this.memory.set(address, res[0], size);
                this.ccr = res[1];
                break;

            case Emulator.TOKEN_REG_DATA.toString() + Emulator.TOKEN_OFFSET_ADDR.toString() :
                var address = parseInt(this.registers[op2.value], 16) + parseInt(op2.offset);
                if(!this.memory.isValidAddress(address)) {
                    //TODO: error non valid address
                    return undefined;
                }
                res = eorOP(size, this.registers[op1.value], this.memory.getLong(address), this.ccr);
                this.memory.set(address, res[0], size);
                this.ccr = res[1];
                break;

            case Emulator.TOKEN_REG_DATA.toString() + Emulator.TOKEN_REG_DATA.toString() :

                res = eorOP(size, this.registers[op1.value], this.registers[op2.value], this.ccr);
                this.registers[op2.value] = res[0];
                this.ccr = res[1];
                break;

        }
    }

    // Bitwise xor of the two operands, the result is stored in the destination operand
    // The first operand must be an immediate value
    // Can't use address registers as destination operands
    eori(size, op1, op2) {
        switch(op1.type.toString() + op2.type.toString()) {
            case Emulator.TOKEN_IMMEDIATE.toString() + Emulator.TOKEN_OFFSET.toString():

                var address = parseInt(op2.value);
                if(!this.memory.isValidAddress(address)) {
                    //TODO: error non valid address
                    return undefined;
                }
                var res = eorOP(size, parseInt(op1.value), this.memory.getLong(address), this.ccr);
                this.memory.set(address, res[0], size);
                this.ccr = res[1];
                break;

            case Emulator.TOKEN_IMMEDIATE.toString() + Emulator.TOKEN_OFFSET_ADDR.toString():

                var address = parseInt(this.registers[op2.value], 16) + parseInt(op2.offset);
                if(!this.memory.isValidAddress(address)) {
                    //TODO: error non valid address
                    return undefined;
                }
                res = eorOP(size, parseInt(op1.value), this.memory.getLong(address), this.ccr);
                this.memory.set(address, res[0], size);
                this.ccr = res[1];
                break;
                
            case Emulator.TOKEN_IMMEDIATE.toString() + Emulator.TOKEN_REG_DATA.toString():

                res = eorOP(size, parseInt(op1.value), this.registers[op2.value], this.ccr);
                this.registers[op2.value] = res[0];
                this.ccr = res[1];
                break;
        }
    }

    // Negate a number from positive to negative and vice-versa
    neg(size, op) {

        switch(op.type) {
            case Emulator.TOKEN_REG_DATA :
                var res = addOP(this.registers[op.value] * -1, 0x0, this.ccr, size);
                this.registers[op.value] = res[0];
                this.ccr = res[1];
               // this.registers[op.value] = negOP(size, this.registers[op.value]);
                break;
            case Emulator.TOKEN_OFFSET :

                var address = parseInt(op.value);
                if(!this.memory.isValidAddress(address)) {
                    //TODO: error non valid address
                    return undefined;
                }
                res = addOP(this.memory.getLong(address) * -1, 0x0, this.ccr, size);
                this.memory.set(address, res[0], size);
                this.ccr = res[1];
                break;
            case Emulator.TOKEN_OFFSET_ADDR :

                var address = parseInt(this.registers[op.value], 16) + parseInt(op.offset);
                if(!this.memory.isValidAddress(address)) {
                    //TODO: error non valid address
                    return undefined;
                }
                res = addOP(this.memory.getLong(address) * -1, 0x0, this.ccr, size);
                this.memory.set(address, res[0], size);
                this.ccr = res[1];
                break;
            default :
                // Error can't neg an address register
                break;
        }
    }

    // Extends the sign of a byte to word or of a word to long-word
    ext(size, op) {
        if(size = Emulator.CODE_BYTE) {
            // Error, this isntruction is word or long-word
            return;
        }

        switch(op.type) {
            case Emulator.TOKEN_REG_DATA :
                var res = extOP(size, this.registers[op.value], this.ccr);
                this.registers[op.value] = res[0];
                this.ccr = res[1];
                break;
            default :
                // Can only ext a data register
                break;
        }
    }

    // Logical left and right shift
    llrShifts(size, op1, op2, right) {
        var res;
        switch(op1.type.toString() + op2.type.toString()) {
            case Emulator.TOKEN_IMMEDIATE.toString() + Emulator.TOKEN_OFFSET.toString():

                var address = parseInt(op2.value);
                if(!this.memory.isValidAddress(address)) {
                    //TODO: error non valid address
                    return undefined;
                }
                op1 = parseInt(op1.value);
                if(op1 > 0x01) {
                    // Error can't shift memory for more than a bit at a time
                    return;
                }
                if(size != Emulator.CODE_WORD) {
                    // Error can't shift any size different than word in memory
                    return;
                }
                if(right) {
                    res = lsrOP(size, op1, this.memory.getLong(address), this.ccr);
                    this.memory.set(address, res[0], size);     
                    this.ccr = res[1];
                }
                else {
                    res = lslOP(size, op1, this.memory.getLong(address), this.ccr);
                    this.memory.set(address, res[0], size);     
                    this.ccr = res[1];   
                }       
                break;

            case Emulator.TOKEN_IMMEDIATE.toString() + Emulator.TOKEN_OFFSET_ADDR.toString():

                var address = parseInt(this.registers[op2.value], 16) + parseInt(op2.offset);
                if(!this.memory.isValidAddress(address)) {
                    //TODO: error non valid address
                    return undefined;
                }
                op1 = parseInt(op1.value);
                if(op1 > 0x01) {
                    // Error can't shift memory for more than a bit at a time
                    return;
                }
                if(size != Emulator.CODE_WORD) {
                    // Error can't shift any size different than word in memory
                    return;
                }
                if(right) {
                    res = lsrOP(size, op1, this.memory.getLong(address), this.ccr);
                    this.memory.set(address, res[0], size);
                    this.ccr = res[1];
                }
                else {
                    res = lslOP(size, op1, this.memory.getLong(address), this.ccr);
                    this.memory.set(address, res[0], size);
                    this.ccr = res[1];
                }
                break;
                
            case Emulator.TOKEN_IMMEDIATE.toString() + Emulator.TOKEN_REG_DATA.toString():

                op1 = parseInt(op1.value);
                if(op1 > 0x08) {
                    // Error can't shift immediate for more than 08 bits
                }
                if(right) {
                    res = lsrOP(size, op1, this.registers[op2.value], this.ccr);
                    this.registers[op2.value] = res[0];
                    this.ccr = res[1];
                }
                else {
                    res = lslOP(size, op1, this.registers[op2.value], this.ccr);
                    this.registers[op2.value] = res[0];
                    this.ccr = res[1];
                }
                break;
            
            case Emulator.TOKEN_REG_DATA.toString() + Emulator.TOKEN_OFFSET.toString():

                var address = parseInt(op2.value);
                if(!this.memory.isValidAddress(address)) {
                    //TODO: error non valid address
                    return undefined;
                }

                op1 = this.registers[op1.value]
                if(op1 > 0x01) {
                    // Error can't shift memory for more than a bit at a time
                    return;
                }
                if(size != Emulator.CODE_WORD) {
                    // Error can't shift any size different than word in memory
                    return;
                }

                if(right) {
                    res = lsrOP(size, op1, this.memory.getLong(address), this.ccr);
                    this.memory.set(address, res[0], size);
                    this.ccr = res[1];
                }
                else {
                    res = lslOP(size, op1, this.memory.getLong(address), this.ccr);
                    this.memory.set(address, res[0], size);
                    this.ccr = res[1];
                }
                break;

            
            case Emulator.TOKEN_REG_DATA.toString() + Emulator.TOKEN_OFFSET_ADDR.toString() :
                var address = parseInt(this.registers[op2.value], 16) + parseInt(op2.offset);
                if(!this.memory.isValidAddress(address)) {
                    //TODO: error non valid address
                    return undefined;
                }
                op1 = this.registers[op1.value]
                if(op1 > 0x01) {
                    // Error can't shift memory for more than a bit at a time
                    return;
                }
                if(size != Emulator.CODE_WORD) {
                    // Error can't shift any size different than word in memory
                    return;
                }
                if(right) {
                    res = lsrOP(size, op1, this.memory.getLong(address), this.ccr);
                    this.memory.set(address, res[0], size);
                    this.ccr = res[1];
                }
                else {
                    res = lslOP(size, op1, this.memory.getLong(address), this.ccr);
                    this.memory.set(address, res[0], size);
                    this.ccr = res[1];
                }
                break;

            case Emulator.TOKEN_REG_DATA.toString() + Emulator.TOKEN_REG_DATA.toString() :

                op1 = this.registers[op1.value]
                var ceiling = getShiftCeiling(size)
                if(op1 > ceiling) op1 = ceiling;
                if(right) {
                    res = lsrOP(size, op1, this.registers[op2.value], this.ccr);
                    this.registers[op2.value] = res[0];
                    this.ccr = res[1];
                }
                else {
                    res = lslOP(size, op1, this.registers[op2.value], this.ccr);
                    this.registers[op2.value] = res[0];
                    this.ccr = res[1];
                }
                break;
    
        }
    }

    // Arithmetical left and right shifts
    alrShifts(size, op1, op2, right) {
        var res;
        switch(op1.type.toString() + op2.type.toString()) {
            
            case Emulator.TOKEN_IMMEDIATE.toString() + Emulator.TOKEN_OFFSET.toString():

                var address = parseInt(op2.value);
                if(!this.memory.isValidAddress(address)) {
                    //TODO: error non valid address
                    return undefined;
                }
                op1 = parseInt(op1.value);
                if(op1 > 0x01) {
                    // Error can't shift memory for more than a bit at a time
                    return;
                }
                if(size != Emulator.CODE_WORD) {
                    // Error can't shift any size different than word in memory
                    return;
                }
                if(right) res = asrOP(size, op1, this.memory.getLong(address), this.ccr);
                else res = aslOP(size, op1, this.memory.getLong(address), this.ccr);

                this.memory.set(address, res[0] , size);  
                this.ccr = res[1];

                break;

            case Emulator.TOKEN_IMMEDIATE.toString() + Emulator.TOKEN_OFFSET_ADDR.toString():

                var address = parseInt(this.registers[op2.value], 16) + parseInt(op2.offset);
                if(!this.memory.isValidAddress(address)) {
                    //TODO: error non valid address
                    return undefined;
                }
                op1 = parseInt(op1.value);
                if(op1 > 0x01) {
                    // Error can't shift memory for more than a bit at a time
                    return;
                }
                if(size != Emulator.CODE_WORD) {
                    // Error can't shift any size different than word in memory
                    return;
                }
                if(right) res = asrOP(size, op1, this.memory.getLong(address), this.ccr);
                else res = aslOP(size, op1, this.memory.getLong(address), this.ccr);

                this.memory.set(address, res[0] , size);
                this.ccr = res[1];

                break;
                
            case Emulator.TOKEN_IMMEDIATE.toString() + Emulator.TOKEN_REG_DATA.toString():

                op1 = parseInt(op1.value);
                if(op1 > 0x08) {
                    // Error can't shift immediate for more than 08 bits
                }
                if(right) res = asrOP(size, op1, this.registers[op2.value], this.ccr); 
                else aslOP(size, op1, this.registers[op2.value], this.ccr);
                this.registers[op2.value] = res[0];
                this.ccr = res[1];
                break;
            
            case Emulator.TOKEN_REG_DATA.toString() + Emulator.TOKEN_OFFSET.toString():

                var address = parseInt(op2.value);
                if(!this.memory.isValidAddress(address)) {
                    //TODO: error non valid address
                    return undefined;
                }
                op1 = this.registers[op1.value]
                if(op1 > 0x01) {
                    // Error can't shift memory for more than a bit at a time
                    return;
                }
                if(size != Emulator.CODE_WORD) {
                    // Error can't shift any size different than word in memory
                    return;
                }

                if(right) res = asrOP(size, op1, this.memory.getLong(address), this.ccr);
                else res = aslOP(size, op1, this.memory.getLong(address), this.ccr);
                this.memory.set(address, res[0] , size);
                this.ccr = res[1];
                break;

            
            case Emulator.TOKEN_REG_DATA.toString() + Emulator.TOKEN_OFFSET_ADDR.toString() :
                var address = parseInt(this.registers[op2.value], 16) + parseInt(op2.offset);
                if(!this.memory.isValidAddress(address)) {
                    //TODO: error non valid address
                    return undefined;
                }
                op1 = this.registers[op1.value]
                if(op1 > 0x01) {
                    // Error can't shift memory for more than a bit at a time
                    return;
                }
                if(size != Emulator.CODE_WORD) {
                    // Error can't shift any size different than word in memory
                    return;
                }
                if(right) res = asrOP(size, op1, this.memory.getLong(address), this.ccr);
                else res = aslOP(size, op1, this.memory.getLong(address), this.ccr);
                this.memory.set(address, res[0], size);
                this.ccr = res[1];
                break;

            case Emulator.TOKEN_REG_DATA.toString() + Emulator.TOKEN_REG_DATA.toString() :

                op1 = this.registers[op1.value]
                var ceiling = getShiftCeiling(size)
                if(op1 > ceiling) op1 = ceiling;
                if(right) res = asrOP(size, op1, this.registers[op2.value], this.ccr);
                else res = aslOP(size, op1, this.registers[op2.value], this.ccr);
                this.registers[op2.value] = res[0];
                this.ccr = res[1];
                break;
    
        }
    }

    // Right and left bits rotations
    lrRotations(size, op1, op2, right) {
        var res ;
        switch(op1.type.toString() + op2.type.toString()) {
            case Emulator.TOKEN_IMMEDIATE.toString() + Emulator.TOKEN_OFFSET.toString():

                var address = parseInt(op2.value);
                if(!this.memory.isValidAddress(address)) {
                    //TODO: error non valid address
                    return undefined;
                }
                op1 = parseInt(op1.value);
                if(op1 > 0x01) {
                    // Error can't rotate memory for more than a bit at a time
                    return;
                }
                if(size != Emulator.CODE_WORD) {
                    // Error can't rotate any size different than word in memory
                    return;
                }
                if(right) res = rorOP(size, op1, this.memory.getLong(address), this.ccr);
                else res = rolOP(size, op1, this.memory.getLong(address), this.ccr);
                this.memory.set(address, res[0], size);       
                this.ccr = res[1];         
                break;

            case Emulator.TOKEN_IMMEDIATE.toString() + Emulator.TOKEN_OFFSET_ADDR.toString():

                var address = parseInt(this.registers[op2.value], 16) + parseInt(op2.offset);
                if(!this.memory.isValidAddress(address)) {
                    //TODO: error non valid address
                    return undefined;
                }
                op1 = parseInt(op1.value);
                if(op1 > 0x01) {
                    // Error can't rotate memory for more than a bit at a time
                    return;
                }
                if(size != Emulator.CODE_WORD) {
                    // Error can't rotate any size different than word in memory
                    return;
                }
                if(right) res = rorOP(size, op1, this.memory.getLong(address), this.ccr);               
                else res = rolOP(size, op1, this.memory.getLong(address), this.ccr);
                this.memory.set(address, res[0], size);
                this.ccr = res[1];
                break;
                
            case Emulator.TOKEN_IMMEDIATE.toString() + Emulator.TOKEN_REG_DATA.toString():

                op1 = parseInt(op1.value);
                if(op1 > 0x08) {
                    // Error can't rotate immediate for more than 08 bits
                }
                if(right) res = rorOP(size, op1, this.registers[op2.value], this.ccr);
                else res = rolOP(size, op1, this.registers[op2.value], this.ccr);
                this.registers[op2.value] = res[0];
                this.ccr = res[1];
                break;
            
            case Emulator.TOKEN_REG_DATA.toString() + Emulator.TOKEN_OFFSET.toString():

                var address = parseInt(op2.value);
                if(!this.memory.isValidAddress(address)) {
                    //TODO: error non valid address
                    return undefined;
                }

                op1 = this.registers[op1.value]
                if(op1 > 0x01) {
                    // Error can't rotate memory for more than a bit at a time
                    return;
                }
                if(size != Emulator.CODE_WORD) {
                    // Error can't rotate any size different than word in memory
                    return;
                }

                if(right) res = rorOP(size, op1, this.memory.getLong(address), this.ccr);
                else res = rolOP(size, op1, this.memory.getLong(address), this.ccr);
                this.memory.set(address, res[0], size);
                this.ccr = res[1];
                break;

            
            case Emulator.TOKEN_REG_DATA.toString() + Emulator.TOKEN_OFFSET_ADDR.toString() :
                var address = parseInt(this.registers[op2.value], 16) + parseInt(op2.offset);
                if(!this.memory.isValidAddress(address)) {
                    //TODO: error non valid address
                    return undefined;
                }
                op1 = this.registers[op1.value]
                if(op1 > 0x01) {
                    // Error can't rotate memory for more than a bit at a time
                    return;
                }
                if(size != Emulator.CODE_WORD) {
                    // Error can't rotate any size different than word in memory
                    return;
                }
                if(right) res = rorOP(size, op1, this.memory.getLong(address), this.ccr);
                else res = rolOP(size, op1, this.memory.getLong(address), this.ccr);
                this.memory.set(address, res[0], size);
                this.ccr = res[1];
                break;

            case Emulator.TOKEN_REG_DATA.toString() + Emulator.TOKEN_REG_DATA.toString() :

                op1 = this.registers[op1.value]
                var ceiling = getShiftCeiling(size)
                if(op1 > ceiling) op1 = ceiling;
                if(right) res = rorOP(size, op1, this.registers[op2.value], this.ccr);
                else res = rolOP(size, op1, this.registers[op2.value], this.ccr);
                this.registers[op2.value] = res[0];
                this.ccr = res[1];
                break;
    
        }
    }

    // Compare 
    cmp(size, op1, op2) {
        var res;

        switch(op1.type.toString() + op2.type.toString()) {
            case Emulator.TOKEN_REG_DATA.toString() + Emulator.TOKEN_REG_DATA.toString():
                res = cmpOP(size, this.registers[op1.value], this.registers[op2.value], this.ccr);
                this.ccr = res[1];
                break;
            case Emulator.TOKEN_REG_ADDR.toString() + Emulator.TOKEN_REG_DATA.toString():
                res = cmpOP(size, this.registers[op1.value], this.registers[op2.value], this.ccr);
                this.ccr = res[1];
                break;
            case Emulator.TOKEN_OFFSET.toString() + Emulator.TOKEN_REG_DATA.toString():
                var address = parseInt(op1.value);
                if(!this.memory.isValidAddress(address)) {
                    //TODO: error non valid address
                    return undefined;
                }
                res = cmpOP(size, this.memory.getLong(address), this.registers[op2.value], this.ccr);
                this.ccr = res[1];
                break;
            case Emulator.TOKEN_OFFSET_ADDR.toString() + Emulator.TOKEN_REG_DATA.toString():
                var address = parseInt(this.registers[op1.value], 16) + parseInt(op1.offset);
                if(!this.memory.isValidAddress(address)) {
                    //TODO: error non valid address
                    return undefined;
                }
                res = cmpOP(size, this.memory.getLong(address), this.registers[op2.value], this.ccr);
                this.ccr = res[1]; 
                break;
            case Emulator.TOKEN_IMMEDIATE.toString() + Emulator.TOKEN_REG_DATA.toString():
                op1 = parseInt(op1.value);
                res = cmpOP(size, op1, this.registers[op2.value], this.ccr);
                this.ccr = res[1];
                break;
        }
    }

    // Compare address
    cmpa(size, op1, op2) {
        var res;

        switch(op1.type.toString() + op2.type.toString()) {
            case Emulator.TOKEN_REG_DATA.toString() + Emulator.TOKEN_REG_ADDR.toString():
                res = cmpOP(size, this.registers[op1.value], this.registers[op2.value], this.ccr);
                this.ccr = res[1];
                break;
            case Emulator.TOKEN_REG_ADDR.toString() + Emulator.TOKEN_REG_ADDR.toString():
                res = cmpOP(size, this.registers[op1.value], this.registers[op2.value], this.ccr);
                this.ccr = res[1];
                break;
            case Emulator.TOKEN_OFFSET.toString() + Emulator.TOKEN_REG_ADDR.toString():
                var address = parseInt(op1.value);
                if(!this.memory.isValidAddress(address)) {
                    //TODO: error non valid address
                    return undefined;
                }
                res = cmpOP(size, this.memory.getLong(address), this.registers[op2.value], this.ccr);
                this.ccr = res[1];
                break;
            case Emulator.TOKEN_OFFSET_ADDR.toString() + Emulator.TOKEN_REG_ADDR.toString():
                var address = parseInt(this.registers[op1.value], 16) + parseInt(op1.offset);
                if(!this.memory.isValidAddress(address)) {
                    //TODO: error non valid address
                    return undefined;
                }
                res = cmpOP(size, this.memory.getLong(address), this.registers[op2.value], this.ccr);
                this.ccr = res[1]; 
                break;
            case Emulator.TOKEN_IMMEDIATE.toString() + Emulator.TOKEN_REG_ADDR.toString():
                op1 = parseInt(op1.value);
                res = cmpOP(size, op1, this.registers[op2.value], this.ccr);
                this.ccr = res[1];
                break;
        }
    }

    // Compare immediate
    cmpi(size, op1, op2) {
        var res;

        switch(op1.type.toString() + op2.type.toString()) {
            case Emulator.TOKEN_IMMEDIATE.toString() + Emulator.TOKEN_REG_DATA.toString():
                res = cmpOP(size, parseInt(op1.value), this.registers[op2.value], this.ccr);
                this.ccr = res[1];
                break;
            case Emulator.TOKEN_IMMEDIATE.toString() + Emulator.TOKEN_OFFSET.toString():
                var address = parseInt(op2.value);
                if(!this.memory.isValidAddress(address)) {
                    //TODO: error non valid address
                    return undefined;
                }
                res = cmpOP(size, parseInt(op1.value), this.memory.getLong(address), this.ccr);
                this.ccr = res[1];
                break;
            case Emulator.TOKEN_IMMEDIATE.toString() + Emulator.TOKEN_OFFSET_ADDR.toString():
                var address = parseInt(this.registers[op2.value], 16) + parseInt(op2.offset);
                if(!this.memory.isValidAddress(address)) {
                    //TODO: error non valid address
                    return undefined;
                }
                res = cmpOP(size, parseInt(op1.value), this.memory.getLong(address), this.ccr);
                this.ccr = res[1]; 
                break;
        }
    }
    // Test an operand with 0
    tst(size, op1) {
        var res;
        switch(op1.type) {
            case Emulator.TOKEN_REG_DATA:
                res = tstOP(size, this.registers[op1.value], this.ccr);
                this.ccr = res[1];
                break;
            case Emulator.TOKEN_OFFSET:
                var address = parseInt(op1.value);
                if(!this.memory.isValidAddress(address)) {
                    //TODO: error non valid address
                    return undefined;
                }
                res = tstOP(size, this.memory.getLong(address), this.ccr);
                this.ccr = res[1];
                break;
            case Emulator.TOKEN_OFFSET_ADDR:
                var address = parseInt(this.registers[op1.value], 16) + parseInt(op1.offset);
                if(!this.memory.isValidAddress(address)) {
                    //TODO: error non valid address
                    return undefined;
                }
                res = tstOP(size, this.memory.getLong(address), this.ccr);
                this.ccr = res[1];
                break;
        }
    }
    
    jmp(op) {

        op = parseInt(op);
        this.pc += op;
        console.log("Jumping to: " + this.pc);
        //this.pc = aux;
        //console.log("pc in: " + this.pc);
        return;
    }

    bra(size, op) {
        op = parseInt(op);
        var res = braOP(size, op, this.pc);
        if(res[1]) {
            console.log("Offset too long for bra");
            // Error offset too long for bra
            return;
        }
        this.pc = res[0];
        return;
    }

    jsr(op) {
        this.memory.set(this.registers[7] += 4, this.pc, Emulator.CODE_LONG ); // Saving the current PC in the stack (register 7 is SP = a7) +4 because an address is a long
        this.jmp(op); // Performing a jump to subroutine
        return;
    }

    rts() {
        this.pc = this.memory.getLong(this.registers[7]); // Retrieving the return address on the top of the stack
        this.memory.set(this.registers[7], 0x00000000, Emulator.CODE_LONG); // Clearing the stack of it
        this.registers[7] -= 4; // Popping the stack
    }

    bsr(size, op) {
        this.memory.set(this.registers[7] += 4, this.pc, Emulator.CODE_LONG ); // Saving the current PC in the stack (register 7 is SP = a7) +4 because an address is a long
        this.bra(size, op); // Performing a bra to subroutine
        return;
    }

    beq(size, op) {
        op = parseInt(op);
        var res = beqOP(size, op, this.pc);
        if(res[1]) {
            console.log("Offset too long for beq");
            // Error offset too long for bra
            return;
        }
        this.pc = res[0];
        return;
    }

    bne(size, op) {
        op = parseInt(op);
        var res = bneOP(size, op, this.pc);
        if(res[1]) {
            console.log("Offset too long for bne");
            // Error offset too long for bra
            return;
        }
        this.pc = res[0];
        return;
    }

    bge(size, op) {
        op = parseInt(op);
        var res = bgeOP(size, op, this.pc);
        if(res[1]) {
            console.log("Offset too long for bge");
            // Error offset too long for bra
            return;
        }
        this.pc = res[0];
        return;
    }

    bgt(size, op) {
        op = parseInt(op);
        var res = bgtOP(size, op, this.pc);
        if(res[1]) {
            console.log("Offset too long for bgt");
            // Error offset too long for bra
            return;
        }
        this.pc = res[0];
        return;
    }

    ble(size, op) {
        op = parseInt(op);
        var res = bleOP(size, op, this.pc);
        if(res[1]) {
            console.log("Offset too long for ble");
            // Error offset too long for bra
            return;
        }
        this.pc = res[0];
        return;
    }

    blt(size, op) {
        op = parseInt(op);
        var res = bltOP(size, op, this.pc);
        if(res[1]) {
            console.log("Offset too long for blt");
            // Error offset too long for bra
            return;
        }
        this.pc = res[0];
        return;
    }

    // Destination must be a data register
    // Source can be anything but address register
    // Word-size only -> long as result
    mulu(size, op1, op2) {
        if(op1 == undefined || op2 == undefined) {
            // TODO : error
            return undefined;
        }

        if(size === Emulator.CODE_LONG || size === Emulator.CODE_BYTE) {
            // TODO: warning, src and dest will be cast as word (16-bits);
            console.log("warning: src and dest will be cast as word (16-bits)");
        }  

        switch(op1.type.toString() + op2.type.toString()) {
            
            case Emulator.TOKEN_REG_ADDR.toString() + Emulator.TOKEN_REG_ADDR.toString() :
            case Emulator.TOKEN_OFFSET_ADDR.toString() + Emulator.TOKEN_OFFSET_ADDR.toString() :
                //TODO: error can't do memory to memory add
                break;
            
            // Example add.w $5, d0
            case Emulator.TOKEN_OFFSET.toString() + Emulator.TOKEN_REG_DATA.toString() : 

                var address = parseInt(op1.value);
                
                if(!this.memory.isValidAddress(address)) {
                    //TODO: error non valid address
                    return undefined;
                }

                var res , src = this.memory.getLong(address);
                res = mulOP(src, this.registers[op2.value], this.ccr, true);
                this.registers[op2.value] = res[0];
                this.ccr = res[1];
                break;
                       
            // Example: add.w (a0), d0 || add.w $10(a0), d0 || TODO: add.w (a0)+, d0
            case Emulator.TOKEN_OFFSET_ADDR.toString() + Emulator.TOKEN_REG_DATA.toString() :

                var address = parseInt(this.registers[op1.value], 16) + parseInt(op1.offset);
                if(!this.memory.isValidAddress(address)) {
                    //TODO: error non valid address
                    return undefined;
                }
                var res , src = this.memory.getLong(address);
                res = mulOP(src, this.registers[op2.value], this.ccr, true);
                this.registers[op2.value] = res[0];
                this.ccr = res[1];
                break;

            // Example : add.w d0, d1
            case Emulator.TOKEN_REG_DATA.toString() + Emulator.TOKEN_REG_DATA.toString() :

                var res , src = this.registers[op1.value];
                res = mulOP(src, this.registers[op2.value], this.ccr, true);
                this.registers[op2.value] = res[0];
                this.ccr = res[1];
                break;
            
            case Emulator.TOKEN_IMMEDIATE.toString() + Emulator.TOKEN_REG_DATA.toString() :
                var res , src = parseInt(op1.value);
                res = mulOP(src, this.registers[op2.value], this.ccr, true);
                this.registers[op2.value] = res[0];
                this.ccr = res[1];
                break;
        }
    }

    // Destination must be a data register
    // Source can be anything but address register
    // Word-size only -> long as result
    muls(size, op1, op2) {
        if(op1 == undefined || op2 == undefined) {
            // TODO : error
            return undefined;
        }

        if(size === Emulator.CODE_LONG || size === Emulator.CODE_BYTE) {
            // TODO: warning, src and dest will be cast as word (16-bits);
            console.log("warning: src and dest will be cast as word (16-bits)");
        }  

        switch(op1.type.toString() + op2.type.toString()) {
            
            case Emulator.TOKEN_REG_ADDR.toString() + Emulator.TOKEN_REG_ADDR.toString() :
            case Emulator.TOKEN_OFFSET_ADDR.toString() + Emulator.TOKEN_OFFSET_ADDR.toString() :
                //TODO: error can't do memory to memory add
                break;
            
            // Example add.w $5, d0
            case Emulator.TOKEN_OFFSET.toString() + Emulator.TOKEN_REG_DATA.toString() : 

                var address = parseInt(op1.value);
                
                if(!this.memory.isValidAddress(address)) {
                    //TODO: error non valid address
                    return undefined;
                }

                var res , src = this.memory.getLong(address);
                res = mulOP(src, this.registers[op2.value], this.ccr, false);
                this.registers[op2.value] = res[0];
                this.ccr = res[1];
                break;
                       
            // Example: add.w (a0), d0 || add.w $10(a0), d0 || TODO: add.w (a0)+, d0
            case Emulator.TOKEN_OFFSET_ADDR.toString() + Emulator.TOKEN_REG_DATA.toString() :

                var address = parseInt(this.registers[op1.value], 16) + parseInt(op1.offset);
                if(!this.memory.isValidAddress(address)) {
                    //TODO: error non valid address
                    return undefined;
                }
                var res , src = this.memory.getLong(address);
                res = mulOP(src, this.registers[op2.value], this.ccr, false);
                this.registers[op2.value] = res[0];
                this.ccr = res[1];
                break;

            // Example : add.w d0, d1
            case Emulator.TOKEN_REG_DATA.toString() + Emulator.TOKEN_REG_DATA.toString() :

                var res , src = this.registers[op1.value];
                res = mulOP(src, this.registers[op2.value], this.ccr, false);
                this.registers[op2.value] = res[0];
                this.ccr = res[1];
                break;
            
            case Emulator.TOKEN_IMMEDIATE.toString() + Emulator.TOKEN_REG_DATA.toString() :
                var res , src = parseInt(op1.value);
                res = mulOP(src, this.registers[op2.value], this.ccr, false);
                this.registers[op2.value] = res[0];
                this.ccr = res[1];
                break;
        }
    }
}