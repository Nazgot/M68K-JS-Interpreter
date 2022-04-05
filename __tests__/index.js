import { Emulator } from '../dist/index.esm.js'
const program = 
`ORG    $1000
START:                  
    move.l #-325,d1 ; int s1 = -325
    move.l #826,d3  ; int s3 = 826
    move.l d1,d4    ; int t1 = s1
    add.l #22,d4    ; t1 = t1 + 22
    move.l d3,d5    ; int t2 = s3
    sub.l #329,d5   ; t2 = t2 - 329
    move.l #2048,d7 ; int t3 = 2048
    sub.l d4,d7     ; t3 = t3 - t1
    move.l d7,d4    ; t1 = t3
    move.l d4,d2    ; int s2 = t1
    add.l d5, d2    ; s2 = s2 + t2
    move.l d1,d4    ; t1 = s1
    sub.l #345,d4   ; t1 = t1 - 345 
    move.l d1,d5    ; t2 = s1
    add.l #9,d5     ; t2 = t2 + 9
    move.l d2,d3    ; s3 = s2
    sub.l d5,d3     ; s3 = s3 - t2
    sub.l d3,d4     ; t1 = t1 - s3
    sub.l d4,d1     ; s1 = s1 - t1
END`

const emulator = new Emulator(program)
while(!emulator.emulationStep())
console.log(emulator.registers)