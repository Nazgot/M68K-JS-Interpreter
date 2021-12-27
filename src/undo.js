'use strict'

// Undo is a stack that keeps track of the program execution
// And allow us to go back in time during step by step execution
export default class {

    constructor() {
        this.stack = [];
    }
    
    // Returns the whole stack
    getStack() {
        return this.stack;
    }

    // Creates and returns a new stack frame
    makeFrame(pc, ccr, registers, memory, errors, lastInstruction, line) {

        return {
            pc: pc,
            ccr: ccr,
            lastInstruction: lastInstruction,
            line: line,
            registers: [... registers],
            memory: {... memory},
            errors: [... errors]
        }

    }

    // Pushes a new frame into the stack
    push(pc, ccr, registers, memory, errors, lastInstruction, line) {
        this.stack.push(this.makeFrame(pc, ccr, registers, memory, errors, lastInstruction, line));
    }

    // Pops the top frame on the stack
    // Returns undefined if the stack is empty
    pop() {
        return this.stack.isEmpty() ? undefined : this.stack.pop();
    }

    // Look at the top frame in the stack without returning it
    peek() {
        return this.stack[this.stack.length - 1]; 
    }

    // Checks if the current stack is empty
    isEmpty() {
        return !this.stack.length;
    }

    // Resets the stack
    clearStack() {
        this.stack = [];
    }

}