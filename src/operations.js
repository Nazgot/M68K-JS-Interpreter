'use strict'
//TODO maybe convert those if else to ternaries?

export function addOP(src, dest, ccr, size, is_sub) {
    switch(size) {
        case Emulator.CODE_LONG: 
            return addLong(src,dest,ccr,is_sub);
        case Emulator.CODE_WORD:
            return addWord(src,dest,ccr,is_sub);
        case Emulator.CODE_BYTE:
            return addByte(src,dest,ccr,is_sub);
        default:
            return undefined;
    }
}

function subCCR(src, dest, fullRes, result, ccr, mask) {

    // Overflow
    if(dest < 0 && src > 0 && result >= 0) ccr = (ccr | 0x02) >>> 0; 
    else ccr = (ccr & 0xFD) >>> 0;

    // Carry
    if(((fullRes & ~mask) >>> 0) != 0) ccr = (ccr | 0x01) >>> 0;
    else ccr = (ccr & 0xFE) >>> 0;
    // Zero
    if(result === 0) ccr = (ccr | 0x04) >>> 0;
    else ccr = (ccr & 0xFB) >>> 0;
    // Negative 
    if(result < 0) ccr = (ccr | 0x08) >>> 0;
    else ccr = (ccr & 0xF7) >>> 0;
    // Extended
    if(((fullRes & ~mask) >>> 0) != 0) ccr = (ccr | 0x10) >>> 0;
    else ccr = (ccr & 0xEF) >>> 0;
    
    return ccr;
}

function addCCR(positive, negative, fullRes, result, ccr, mask) {

    // Managing CCR
    // Overflow
    
    if(positive && result < 0) ccr = (ccr | 0x02) >>> 0; // Positive + positive can't be negative, if that's the case we had an overflow
    else if(negative && result > 0) ccr = (ccr | 0x02) >>> 0; // Negative + negative can't be positive, if that's the case we hand an overflow
    else ccr = (ccr & 0xFD) >>> 0;
    
    // Carry
    if(((fullRes & ~mask) >>> 0) != 0) ccr = (ccr | 0x01) >>> 0;
    else ccr = (ccr & 0xFE) >>> 0;
    // Zero
    if(result === 0) ccr = (ccr | 0x04) >>> 0;
    else ccr = (ccr & 0xFB) >>> 0;
    // Negative 
    if(result < 0) ccr = (ccr | 0x08) >>> 0;
    else ccr = (ccr & 0xF7) >>> 0;
    // Extended
    if(((fullRes & ~mask) >>> 0) != 0) ccr = (ccr | 0x10) >>> 0;
    else ccr = (ccr & 0xEF) >>> 0;

    return ccr;
}

function addWord(src, dest, ccr, is_sub) {
    let aux = dest;

    // need signed 16 bits dest and src for positive and negative testing
    let dest16 = new Int16Array(1);
    dest16[0] = dest & Emulator.WORD_MASK;
    let src16 = new Int16Array(1);
    src16[0] = src & Emulator.WORD_MASK;

    let positive = dest16[0] >= 0 && src16[0] >= 0;
    let negative = dest16[0] < 0 && src16[0] < 0;

    aux = (aux & ~Emulator.WORD_MASK) >>> 0; // We save the 16 leftmost bits of the register
    dest = (dest & Emulator.WORD_MASK) >>> 0; // We extract the 16 rightmost bits from destination 
    if(is_sub) dest -= ((src & Emulator.WORD_MASK) >>> 0);
    else dest += ((src & Emulator.WORD_MASK) >>> 0); // We extract the 16 rightmost bits from src and sum it with dest

    // Forcing 16 bit signed type on the 16 rightmost bits of the result (ignoring eventual carries)
    let result = new Int16Array(1);
    result[0] = dest & Emulator.WORD_MASK;

    // Updating CCR
    if(is_sub) ccr = subCCR(src16[0], dest16[0], dest, result[0], ccr);
    else ccr = addCCR(positive, negative, dest, result[0], ccr, Emulator.WORD_MASK, is_sub);

    dest = (dest & Emulator.WORD_MASK) >>> 0  //we trim again to 16 
    aux += dest; // We sum it to aux that contained the 16 leftmost bits of dest (32 bit sum)
    return [aux, ccr];
}

function addByte(src, dest, ccr, is_sub) {
    let aux = dest;
    // need signed 8 bits dest and src for positive and negative testing
    let dest8 = new Int8Array(1);
    dest8[0] = dest & Emulator.BYTE_MASK;
    let src8 = new Int8Array(1);
    src8[0] = src & Emulator.BYTE_MASK;

    let positive = dest8[0] >= 0 && src8[0] >= 0;
    let negative = dest8[0] < 0 && src8[0] < 0;
    aux = (aux & ~Emulator.BYTE_MASK) >>> 0; // We save the 8 leftmost bits of the register
    dest = (dest & Emulator.BYTE_MASK) >>> 0; // We extract the 8 rightmost bits from destination   
    if(is_sub) dest -= ((src & Emulator.BYTE_MASK) >>> 0);
    else dest += ((src & Emulator.BYTE_MASK) >>> 0); // We extract the 8 rightmost bits from src and sum it with dest

    // Forcing 8 bit signed type on the 16 rightmost bits of the result (ignoring eventual carries)
    let result = new Int8Array(1);
    result[0] = dest & Emulator.BYTE_MASK;

    // Updating CCR
    if(is_sub) ccr = subCCR(src16[0], dest16[0], dest, result[0], ccr);
    else ccr = addCCR(positive, negative, dest, result[0], ccr, Emulator.BYTE_MASK, is_sub);

    dest = (dest & Emulator.BYTE_MASK) >>> 0  //we trim again to 8 
    aux += dest; // We sum it to aux that contained the 8 leftmost bits of dest (32 bit sum)
    return [aux, ccr];
}

function addLong(src, dest, ccr, is_sub) {
    
    let positive = (dest | 0) >= 0 && (src | 0) >= 0;
    let negative = (dest | 0) < 0 && (src | 0) < 0;

    if(is_sub) dest -= src;
    else dest += src;

    let carry = dest > 0xFFFFFFFF;
    dest = dest | 0;

    if(is_sub) {
        if(src > 0 && dest < 0 && dest > 0) ccr = (ccr | 0x02) >>> 0;
        else ccr = (ccr & 0xFD) >>> 0;
    } else {
        if(positive && dest < 0) ccr = (ccr | 0x02) >>> 0; // Positive + positive can't be negative, if that's the case we had an overflow
        else if(negative && dest > 0) ccr = (ccr | 0x02) >>> 0; // Negative + negative can't be positive, if that's the case we hand an overflow
        else ccr = (ccr & 0xFD) >>> 0;
        // Carry
        if(carry) ccr = (ccr | 0x01) >>> 0;
        else ccr = (ccr & 0xFE) >>> 0;
        // Zero
        if(dest === 0) ccr = (ccr | 0x04) >>> 0;
        else ccr = (ccr & 0xFB) >>> 0;
        // Negative 
        if(dest < 0) ccr = (ccr | 0x08) >>> 0;
        else ccr = (ccr & 0xF7) >>> 0;
        // Extended
        if(carry) ccr = (ccr | 0x10) >>> 0;
        else ccr = (ccr & 0xEF) >>> 0;
    }
    

    return [dest, ccr];
}

export function moveOP(src, dest, ccr, size) {
    let aux;
    switch(size) {
        case Emulator.CODE_LONG :
            return [src, moveCCR(src | 0, ccr, Emulator.LONG_MASK)];
        case Emulator.CODE_WORD :
            aux = addOP(src, dest & ~Emulator.WORD_MASK, ccr, size)[0]; // New register value
            let aux16 = new Int16Array(1);  
            aux16[0] = aux & Emulator.WORD_MASK;    // Forcing the result to 16 bit signed for CCR
            return [aux, moveCCR(aux16[0], ccr, Emulator.WORD_MASK)];
        case Emulator.CODE_BYTE :
            aux = addOP(src, dest & ~Emulator.BYTE_MASK, ccr, size)[0]; // New register value
            let aux8 = new Int8Array(1);
            aux8[0] = aux & Emulator.BYTE_MASK;     // Forcing the result to 8 bit signed for CCR
            return [aux, moveCCR(aux8[0], ccr, Emulator.BYTE_MASK)];
        default :
            return undefined;
    }
}

function moveCCR(res, ccr) {
    // Setting carry and overflow bits to 0
    ccr = (ccr & 0xFC) >>> 0;
    // Zero
    if(res === 0) ccr = (ccr | 0x04) >>> 0;
    else ccr = (ccr & 0xFB) >>> 0;
    // Negative 
    if(res < 0) ccr = (ccr | 0x08) >>> 0;
    else ccr = (ccr & 0xF7) >>> 0;

    return ccr;
}

export function swapOP(op, ccr) {
    let tmp = op << 16; // Moving first 16 bits to the most significative positions
    op = op >> 16; // Moving last 16 bits of the register to the least significative positions
    tmp += op; // Combining register
    return [tmp, moveCCR(tmp | 0, ccr)]; // Returning swapped register and CCR (same behaviour as move)
}

export function exgOP(op1, op2) {
    return [op2, op1];
}

export function clrOP(size, op, ccr) {
    ccr = (ccr & 0x10) >>> 0; // Resetting every bit but the Extended bit
    ccr = (ccr | 0x04) >>> 0; // Setting 0 bit to 1
    switch(size) {
        case Emulator.CODE_BYTE:
            return [op & ~Emulator.BYTE_MASK, ccr];
        case Emulator.CODE_WORD:
            return [op & ~Emulator.WORD_MASK, ccr];
        case Emulator.CODE_LONG:
            return [op & 0x00000000, ccr];
    }
}

export function notOP(size, op, ccr) {
    switch(size) {
        case Emulator.CODE_BYTE:{
            let res = ((op & ~Emulator.BYTE_MASK) + (~op & Emulator.BYTE_MASK)) >>> 0
            let res8 = new Int8Array(1);
            res8[0] = res & Emulator.BYTE_MASK;     // Forcing the result to 8 bit signed for CCR
            return [res, moveCCR(res8[0], ccr)];    // Same ccr behaviour as move
        }
        case Emulator.CODE_WORD:{
            let res = ((op & ~Emulator.WORD_MASK) + (~op & Emulator.WORD_MASK)) >>> 0
            let res16 = new Int16Array(1);
            res16[0] = res & Emulator.WORD_MASK;     // Forcing the result to 16 bit signed for CCR
            return [res, moveCCR(res16[0], ccr)];    // Same ccr behaviour as move
        }
        case Emulator.CODE_LONG:{
            let res = ~op >>> 0;
            return [res, moveCCR(res | 0, ccr)];     // Same ccr behaviour as move
        }
    }
}

export function andOP(size, op1, op2, ccr) {
    switch(size) {
        case Emulator.CODE_BYTE:{
            let res = ((op2 & ~Emulator.BYTE_MASK) + ((op1 & Emulator.BYTE_MASK) & (op2 & Emulator.BYTE_MASK))) >>> 0;
            let res8 = new Int8Array(1);
            res8[0] = res & Emulator.BYTE_MASK;     // Forcing the result to 8 bit signed for CCR
            return [res, moveCCR(res8[0], ccr)];    // Same ccr behaviour as move
        }
        case Emulator.CODE_WORD:{
            let res = ((op2 & ~Emulator.WORD_MASK) + ((op1 & Emulator.WORD_MASK) & (op2 & Emulator.WORD_MASK))) >>> 0;
            let res16 = new Int16Array(1);
            res16[0] = res & Emulator.WORD_MASK;     // Forcing the result to 16 bit signed for CCR
            return [res, moveCCR(res16[0], ccr)];    // Same ccr behaviour as move
        }
        case Emulator.CODE_LONG:{
            let res = op1 & op2 >>> 0;
            return [res, moveCCR(res | 0, ccr)];     // Same ccr behaviour as move  
        }
    }
}
export function orOP(size, op1, op2, ccr) {
    switch(size) {
        case Emulator.CODE_BYTE: {
            let res = ((op2 & ~Emulator.BYTE_MASK) + ((op1 & Emulator.BYTE_MASK) | (op2 & Emulator.BYTE_MASK))) >>> 0;
            let res8 = new Int8Array(1);
            res8[0] = res & Emulator.BYTE_MASK;     // Forcing the result to 8 bit signed for CCR
            return [res, moveCCR(res8[0], ccr)];    // Same ccr behaviour as move
        }
        case Emulator.CODE_WORD: {
            let res = ((op2 & ~Emulator.WORD_MASK) + ((op1 & Emulator.WORD_MASK) | (op2 & Emulator.WORD_MASK))) >>> 0;
            let res16 = new Int16Array(1);
            res16[0] = res & Emulator.WORD_MASK;     // Forcing the result to 16 bit signed for CCR
            return [res, moveCCR(res16[0], ccr)];    // Same ccr behaviour as move
        }
        case Emulator.CODE_LONG: {
            let res = op1 | op2 >>> 0;
            return [res, moveCCR(res | 0, ccr)];     // Same ccr behaviour as move  
        } 
    }
}

export function eorOP(size, op1, op2, ccr) {
    switch(size) {
        case Emulator.CODE_BYTE: {
            let res = ((op2 & ~Emulator.BYTE_MASK) + ((op1 & Emulator.BYTE_MASK) ^ (op2 & Emulator.BYTE_MASK))) >>> 0;
            let res8 = new Int8Array(1);
            res8[0] = res & Emulator.BYTE_MASK;     // Forcing the result to 8 bit signed for CCR
            return [res, moveCCR(res8[0], ccr)];    // Same ccr behaviour as move
        }
        case Emulator.CODE_WORD: {
            let res = ((op2 & ~Emulator.WORD_MASK) + ((op1 & Emulator.WORD_MASK) ^ (op2 & Emulator.WORD_MASK))) >>> 0;
            let res16 = new Int16Array(1);
            res16[0] = res & Emulator.WORD_MASK;     // Forcing the result to 16 bit signed for CCR
            return [res, moveCCR(res16[0], ccr)];    // Same ccr behaviour as move
        }
        case Emulator.CODE_LONG: {
            let res = op1 ^ op2 >>> 0;
            return [res, moveCCR(res | 0, ccr)];     // Same ccr behaviour as move  
        } 
    }
}

export function negOP(size, op) {
    switch(size) {
        case Emulator.CODE_BYTE: {
            if(op === 0 || op === 128)
                return op;
            let aux = op & ~Emulator.BYTE_MASK >>> 0;
            return aux + (((op * -1) >>> 0) & Emulator.BYTE_MASK);
        }
        case Emulator.CODE_WORD: {
            if(op === 0 || op === 32768)
                return op;
            let aux = op & ~Emulator.WORD_MASK >>> 0;
            return aux + (((op * -1) >>> 0) & Emulator.WORD_MASK);
        }
        case Emulator.CODE_LONG: {
            if(op === 0 || op === 2147483648)
                return op;
            return op * -1;
        }
    }
}

export function extOP(size, op, ccr) {
    switch(size) {
        case Emulator.CODE_WORD:{
            let tmp = op & ~Emulator.WORD_MASK;
            let value = op & Emulator.BYTE_MASK;
            if(value < 0x00000080) {
                tmp += (value >>> 0);
            }
            else {
                tmp = tmp | 0x0000FF00;
                tmp += (value >>> 0);
            }
            let res16 = new Int16Array(1);
            res16[0] = tmp & Emulator.WORD_MASK;   // Forcing the result to 16 bit signed for CCR
            return [tmp, moveCCR(res16[0], ccr)];
        }
        case Emulator.CODE_LONG:{
            let value = op & Emulator.WORD_MASK;
            if(value < 0x00008000) 
               value = 0x00000000 + value;
            else 
                value = ~Emulator.WORD_MASK + value;
            return [value, moveCCR(value | 0, ccr)];
        }
    }
}

function shiftCCR(op1, op2, result, ccr, right) {
    if(op1 = 0x0) {
        ccr = (ccr & 0x1E) >>> 0; // Clearing carry, not clearing extended
    }
    else {
        if(right) {
            let ext = op2 >>> (op1 - 1); // Rightmost bit will be the extended flag
            ext = ext & 0x00000001;
        } else {
            let ext = op2 << (op1 - 1); // Leftmost bit will be the extended flag
            ext = ext & 0x80000000;
        }
        if(ext != 0x0) ccr = (ccr | 0x11) >>> 0; // Flagging extended and carry
        else ccr = (ccr & 0x0E) >>> 0 // Clearing extended and carry
    }
    

    if(result === 0x0) ccr = (ccr | 0x04) >>> 0;     // Flagging zero
    else ccr = (ccr & 0x1B) >>> 0;                  // Clearing zero
    if(result < 0) ccr = (ccr | 0x08) >>> 0;        // Flagging negative
    else ccr = (ccr & 0x17) >>> 0;                  // Clrearing Negative

    ccr = (ccr & 0x1D) >>> 0;                       // Clearing overflow
    return ccr;
}

export function lslOP(size, op1, op2, ccr) {
    switch(size) {
        case Emulator.CODE_BYTE:{
            let aux = op2 & ~Emulator.BYTE_MASK;
            op2 = op2 << op1;
            aux = aux + ((op2 & Emulator.BYTE_MASK) >>> 0);
            let res8 = new Int8Array(1);
            res8[0] = aux & Emulator.BYTE_MASK;
            return [aux, shiftCCR(op1, op2, res8[0], ccr, false)];
        }
        case Emulator.CODE_WORD:{
            let aux = op2 & ~Emulator.WORD_MASK;
            op2 = op2 << op1;
            aux = aux + ((op2 & Emulator.WORD_MASK) >>> 0);
            let res16 = new Int16Array(1);
            res16[0] = aux & Emulator.WORD_MASK;
            return [aux, shiftCCR(op1, op2, res16[0], ccr, false)];
        }
        case Emulator.CODE_LONG:{
            let aux = op2 << op1;
            return [aux, shiftCCR(op1, op2, aux | 0, ccr, false)];
        }
    }
}

export function lsrOP(size, op1, op2, ccr) {
    switch(size) {
        case Emulator.CODE_BYTE:{
            let aux = op2 & ~Emulator.BYTE_MASK;
            op2 = op2 >>> op1;
            aux = aux + ((op2 & Emulator.BYTE_MASK) >>> 0);
            let res8 = new Int8Array(1);
            res8[0] = aux & Emulator.BYTE_MASK;
            return [aux, shiftCCR(op1, op2, res8[0], ccr, true)];
        }
        case Emulator.CODE_WORD:{
            let aux = op2 & ~Emulator.WORD_MASK;
            op2 = op2 >>> op1;
            aux = aux + ((op2 & Emulator.WORD_MASK) >>> 0);
            let res16 = new Int16Array(1);
            res16[0] = aux & Emulator.WORD_MASK;
            return [aux, shiftCCR(op1, op2, res16[0], ccr, true)];
        }
        case Emulator.CODE_LONG:{
            let aux = op2 >>> op1;
            return [aux, shiftCCR(op1, op2, aux | 0, ccr, true)];
        }
    }
}

function ashiftCCR(op1, op2, result, ccr, size, right) {
    
    if(op1 = 0x0) {
        ccr = (ccr & 0x1E) >>> 0; // Clearing carry, not clearing extended
    } else {
        if(right) {
            let ext = op2 >>> (op1 - 1); // Rightmost bit will be the extended flag
            ext = ext & 0x00000001;
        } else {
            let ext = op2 << (op1 - 1); // Leftmost bit will be the extended flag
            ext = ext & 0x80000000;
        }
        if(ext != 0x0) ccr = (ccr | 0x11) >>> 0; // Flagging extended and carry
        else ccr = (ccr & 0x0E) >>> 0 // Clearing extended and carry
    }
    

    if(result === 0x0) ccr = (ccr | 0x04) >>> 0;     // Flagging zero
    else ccr = (ccr & 0x1B) >>> 0;                  // Clearing zero
    if(result < 0) ccr = (ccr | 0x08) >>> 0;        // Flagging negative
    else ccr = (ccr & 0x17) >>> 0;                  // Clrearing Negative

    let mask = getMSBMask(size);

    if(op2 && mask != result && mask) ccr = ccr | 0x02;   // If the MSB has changed at any time during th operation we flag Overflow
    else ccr = (ccr & 0x1D) >>> 0;                  // Clearing overflow
    
    return ccr;
}

export function aslOP(size, op1, op2, ccr) {
    switch(size) {
        case Emulator.CODE_BYTE:{
            let aux = op2 & ~Emulator.BYTE_MASK;
            op2 = op2 << op1;
            aux += ((op2 & Emulator.BYTE_MASK) >>> 0);
            let res8 = new Int8Array(1);
            res8[0] = aux & Emulator.BYTE_MASK;
            return [aux, ashiftCCR(op1, op2, aux | 0, ccr, false)];
        }
        case Emulator.CODE_WORD:{
            let aux = op2 & ~Emulator.WORD_MASK;
            op2 = op2 << op1;
            aux += ((op2 & Emulator.WORD_MASK) >>> 0);
            let res16 = new Int16Array(1);
            res16[0] = aux & Emulator.WORD_MASK;
            return [aux, ashiftCCR(op1, op2, res16[0], ccr, false)];
        }
        case Emulator.CODE_LONG:{
            let aux = op2 << op1;
            return [aux, ashiftCCR(op1, op2, aux | 0, ccr, false)];
        }
    }
}

export function asrOP(size, op1, op2, ccr) {
    switch(size) {
        case Emulator.CODE_BYTE:{
            let aux = op2 & ~Emulator.BYTE_MASK;
            op2 = op2 >> op1;
            aux = aux + ((op2 & Emulator.BYTE_MASK) >>> 0);
            let res8 = new Int8Array(1);
            res8[0] = aux & Emulator.BYTE_MASK;
            return [aux, ashiftCCR(op1, op2, aux | 0, ccr, false)]; 
        }
        case Emulator.CODE_WORD:{
            let aux = op2 & ~Emulator.WORD_MASK;
            op2 = op2 >> op1;
            aux = aux + ((op2 & Emulator.WORD_MASK) >>> 0);
            let res16 = new Int16Array(1);
            res16[0] = aux & Emulator.WORD_MASK;
            return [aux, ashiftCCR(op1, op2, res16[0], ccr, true)];
        }
        case Emulator.CODE_LONG:{
            let aux = op2 >> op1;
            return [aux, ashiftCCR(op1, op2, aux | 0, ccr, true)];
        }
    }
}

function roCCR(op1, op2, result, ccr, right) {
    if(op1 = 0x0) {
        ccr = (ccr & 0x1E) >>> 0; // Clearing carry, not clearing extended
    } else {
        if(right) {
            let ext = op2 >>> (op1 - 1); // Rightmost bit will be the carry flag
            ext = ext & 0x00000001;
        } else {
            let ext = op2 << (op1 - 1); // Leftmost bit will be the carry flag
            ext = ext & 0x80000000;
        }
        if(ext != 0x0) ccr = (ccr | 0x01) >>> 0; // Flagging carry
        else ccr = (ccr & 0x1E) >>> 0 // Clearing Carry
    }
    
    if(result === 0x0) ccr = (ccr | 0x04) >>> 0;     // Flagging zero
    else ccr = (ccr & 0x1B) >>> 0;                  // Clearing zero
    if(result < 0) ccr = (ccr | 0x08) >>> 0;        // Flagging negative
    else ccr = (ccr & 0x17) >>> 0;                  // Clrearing Negative

    ccr = (ccr & 0x1D) >>> 0;                       // Clearing overflow
    return ccr;
}

export function rolOP(size, op1, op2, ccr) {
    switch(size) {
        case Emulator.CODE_BYTE:{
            let aux = op2 & ~Emulator.BYTE_MASK;
            op2 = op2 & Emulator.BYTE_MASK;
            aux = aux + (((op2 << op1) | (op2 >>> (Emulator.SIZE_BYTE - op1))) & Emulator.BYTE_MASK);
            let res8 = new Int8Array(1);
            res8[0] = aux & Emulator.BYTE_MASK;
            return [aux, roCCR(op1, op2, res8[0], ccr, false)];
        }
        case Emulator.CODE_WORD:{
            let aux = op & ~Emulator.WORD_MASK;
            op2 = op2 & Emulator.WORD_MASK;
            aux = aux + (((op2 << op1) | (op2 >>> (Emulator.SIZE_WORD - op1))) & Emulator.WORD_MASK);
            let res16 = new Int16Array(1);
            res16[0] = aux & Emulator.WORD_MASK;
            return [aux, roCCR(op1, op2, res16[0], ccr, false)];
        }
        case Emulator.CODE_LONG:{
            let aux = (op2 << op1) | (op2 >> (Emulator.SIZE_LONG - op1));
            return [aux, roCCR(op1, op2, aux | 0, ccr, false)];
        }
    }
}

export function rorOP(size, op1, op2, ccr) {
    switch(size) {
        case Emulator.CODE_BYTE:{
            let aux = op2 & ~Emulator.BYTE_MASK;
            op2 = op2 & Emulator.BYTE_MASK;
            aux = aux + (((op2 >>> op1) | (op2 << (Emulator.SIZE_BYTE - op1))) & Emulator.BYTE_MASK);
            let res8 = new Int8Array(1);
            res8[0] = aux & Emulator.BYTE_MASK;
            return [aux, roCCR(op1, op2, res8[0], ccr, true)];
        }
        case Emulator.CODE_WORD:{
            let aux = op2 & ~Emulator.WORD_MASK;
            op2 = op2 & Emulator.WORD_MASK;
            aux = aux + (((op2 >>> op1) | (op2 << (Emulator.SIZE_WORD - op1))) & Emulator.WORD_MASK);
            let res16 = new Int16Array(1);
            res16[0] = aux & Emulator.WORD_MASK;
            return [aux, roCCR(op1, op2, res16[0], ccr, true)];
        }
        case Emulator.CODE_LONG:{
            let aux = (op2 >>> op1) | (op2 << (Emulator.SIZE_LONG - op1));
            return [aux, roCCR(op1, op2, aux | 0, ccr, true)];
        }
    }
}

export function cmpOP(size, op1, op2, ccr) {
    let res = addOP(op1, op2, ccr, size, true);
    // We use the add ccr to compute CMP ccr, we then set the extended bit to the previous value in case it was modified by add
    if((ccr & 0xF0) === 0x0) res[1] = res[1] & 0x0F;
    else res[1] = res[1] | 0x10;
    return res;
}

export function tstOP(size, op1, ccr) {
    let res = cmpOP(size, 0x00000000, op1, ccr);
    // Overflow and carry set to 0
    res[1] = res[1] & 0xFC;
    return res;
}

export function braOP(size, op, pc) {
    switch(size) {
        case Emulator.CODE_BYTE:{
            if(op >= 0) 
               return op > 0x7E ?  [pc, true] : [pc + op, false]; 
            else return op < -0x80 ? [pc, true] : [pc + op, false];
        }
        case Emulator.CODE_WORD:{
            if(op >= 0) 
               return op > 0x7FFE ?  [pc, true] : [pc + op, false];
            else return op < -0x8000 ? [pc, true] : [pc + op, false];
        }
    }
}

export function beqOP(size, op, pc, ccr) {
    let ZFlag = ccr & 0x04; // Extracting the Z flag from ccr
    if(!ZFlag)              // If the flag is false we branch
        return braOP(size, op, pc);
    return [pc, false];     // Else we just return the pc
}

export function bneOP(size, op, pc, ccr) {
    let ZFlag = ccr & 0x04; // Extracting the Z flag from ccr
    if(ZFlag)              // If the flag is true we branch
        return braOP(size, op, pc);
    return [pc, false]; // Else we just return the pc
}

export function bgeOP(size, op, pc, ccr) {
    let VFlag = ccr & 0x02;                                // Extracting the V flag from ccr
    let NFlag = ccr & 0x08;                                // Extracting the N flag from ccr
    if( (VFlag && NFlag) || (!VFlag && !NFlag) )           // If both the flags are set, or if both the flags are clear, we branch
        return braOP(size, op, pc);
    return [pc, false];                                    // Else we just return the pc
}

export function bgtOP(size, op, pc, ccr) {
    let ZFlag = ccr & 0x04;                                // Extracting the Z flag from ccr
    let VFlag = ccr & 0x02;                                // Extracting the V flag from ccr
    let NFlag = ccr & 0x08;                                // Extracting the N flag from ccr
    if( !ZFlag && ((VFlag && NFlag) || (!VFlag && !NFlag)))// If Z flag is clear and both the flags are set, or if both the flags are clear, we branch
        return braOP(size, op, pc);
    return [pc, false];                                    // Else we just return the pc
}

export function bleOP(size, op, pc, ccr) {
    let ZFlag = ccr & 0x04;                                // Extracting the Z flag from ccr
    let VFlag = ccr & 0x02;                                // Extracting the V flag from ccr
    let NFlag = ccr & 0x08;                                // Extracting the N flag from ccr
    console.log("Z: " + ZFlag.toString(2));
    console.log("V: " + VFlag.toString(2));
    console.log("N: " + NFlag.toString(2));
    if( ZFlag || (!VFlag && NFlag) || (VFlag && !NFlag) )  
        return braOP(size, op, pc);
    return [pc, false];                                    // Else we just return the pc
}

export function bltOP(size, op, pc, ccr) {
    let VFlag = ccr & 0x02;                                // Extracting the V flag from ccr
    let NFlag = ccr & 0x08;                                // Extracting the N flag from ccr
    if( (!VFlag && NFlag) || (VFlag && !NFlag) )  
        return braOP(size, op, pc);
    return [pc, false];                                    // Else we just return the pc
}

export function mulOP(op1, op2, ccr, is_unsigned) {

    let ops;
    let res;

    if(is_unsigned) {
        ops = new Uint16Array([op1, op2]);
        res = ops[1] * ops[0]; 
    } else {
        ops = new Int16Array([op1, op2]);
        res = ops[1] * ops[0];
    }

    // CCR Management
    
    // Managing Zero flag 
    if(res === 0)
        ccr = (ccr | 0x04) >>> 0;   
    else 
        ccr = (ccr & 0x1B) >>> 0;

    // Managing Negative flag
    if(res < 0)
        ccr = (ccr | 0x08) >>> 0;   
    else 
        ccr = (ccr & 0x17) >>> 0;

    // Re-setting Overflow and Carry flags 
    ccr = (ccr & 0x1C) >>> 0;

    return [res, ccr];
}

export function divOP(op1, op2, ccr, is_unsigned) {

    let ops;
    let quotient;
    let remainder;

    // Checking if the operation will overflow
    if((op2 & !Emulator.WORD_MASK) >= (op1 & Emulator.WORD_MASK)) {
        // Setting the Overflow flag
        ccr = (ccr | 0x02) >>> 0;

        // Re-setting Carry flag
        ccr = (ccr & 0x1E) >>> 0;

        // No changes to the dividend
        return [op2, ccr];
    }

    if(is_unsigned) {
        ops = new Uint16Array([op1]);
        quotient = op2 / ops[0];
        remainder = op2 % ops[0];
    } else {
        ops = new Int16Array([op1]);
        quotient = op2 / ops[0];
        remainder = op2 % ops[0];
    }

    // CCR Management

    // Managing Zero flag 
    if(quotient === 0)
        ccr = (ccr | 0x04) >>> 0;   
    else 
        ccr = (ccr & 0x1B) >>> 0;

    // Managing Negative flag
    if(quotient < 0)
        ccr = (ccr | 0x08) >>> 0;   
    else 
        ccr = (ccr & 0x17) >>> 0;
    
    // Re-setting Carry flag
    ccr = (ccr & 0x1E) >>> 0;

    // Merging remainder and quotient

    // Shifting remainder to the left, should look like 0xABCD0000
    remainder = remainder << 16;

    // Sum of remainder and quotient should be 0xABCD1234 where ABCD is remainder and 1234 is quotient
    let result = remainder + (quotient & Emulator.WORD_MASK);

    return [result, ccr];
}
