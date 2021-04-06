module.exports = class Constants {

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

    // Directives REGEX
    static get DC_REGEX() {return /^[_a-zA-Z][_a-zA-Z0-9]*\:\s+dc\.[wbl]\s+("[a-zA-Z0-9]+"|([0-9]+,)*[0-9]+)$/gmi };
    static get EQU_REGEX() { return /^([_a-zA-Z][_a-zA-Z0-9]*)\:\s+equ\s+([0-9]+)$/gmi };
    static get IMMEDIATE_LABEL_REPLACE() {return /(#(?:\$?|\%?))([A-Za-z_][_A-Z0-9a-z]+)/gmi };
    static get ORG_REGEX() {return /^org\s+(?:0x|\$)([0-9]+)/gmi };

}