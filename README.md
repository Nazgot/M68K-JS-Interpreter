# M68K-JS-Interpreter

A simple javascript interpreter for the M68000 assembly<br/>
STEP, RUN, RESET are finally implemented and working (probably).


## Currently implemented instructions

#### Arithmetic
 - ADD, ADDI, ADDA  
 - SUB, SUBI, SUBA  
 - MULS, MULU
 - DIVS, DIVU
 
#### Binary Instructions
 - NOT, AND, ANDI, OR, ORI, EOR, EORI

#### Basic Instructions

 - MOVE, MOVEA, EXG, CLR, SWAP, NEG, EXT 

#### Shift Instructions

 - LSL, LSR, ASL, ASR, ROL, ROR 

#### Conditional Instructions

 - CMP, CMPA, CMPI, TST

#### Jump Instructions

 - JMP, BRA, JSR, RTS, BSR, BEQ, BNE, BGE, BGT, BLE, BLT

#### Directives

 - EQU, ORG
