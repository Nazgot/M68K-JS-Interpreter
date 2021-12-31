'use strict'

// Exceptions
export const INVALID_PC_EXCEPTION = "Execution killed: Invalid program counter.";
export const DIVISION_BY_ZERO = "Execution killed: attempted a divide by zero operation.";
export const DUPLICATE_LABEL = "Execution killed: duplicate label found: ";
export const UNKNOWN_LABEL = "Execution killed: unknown label: ";
export const END_MISSING = "Execution killed: END directive missing";
export const DUPLICATE_END = "Execution killed: duplicate END directive";
export const MEMORY_OUT_OF_BOUND_EXCEPTION = "Execution killed: Address out of memory bounds, trying to access address ";

// Errors
export const INVALID_OP_SIZE = "Invalid operation size (defaulted to word)";
export const INVALID_REGISTER = "Invalid register name";
export const NOT_AN_ADDRESS_REGISTER = "Address register expected";
export const UNKNOWN_OPERAND = "Unknown operand";
export const TWO_PARAMETERS_EXPECTED = "Two parameters are expected";
export const ONE_PARAMETER_EXPECTED = "One parameter is expected";
export const UNRECOGNISED_INSTRUCTION = "Unrecognised instruction";
export const NO_MEMORY_MEMORY_ALLOWED = "Memory to memory is not allowed for operation";
export const INVALID_ADDRESS = "Invalid address";
export const DATA_ONLY_SWAP = "Can only SWAP a data register";
export const EXG_RESTRICTIONS = "Wrong operands type for EXG";
export const CLR_ON_ADDRESS = "Can't CLR an address register";
export const NOT_ON_ADDRESS = "Can't apply NOT to an address register";
export const NEG_ON_ADDRESS = "Can't negate an address register";
export const EXT_ON_BYTE = "Can't EXT a byte";
export const DATA_ONLY_EXT = "Can only EXT a data register";
export const ONE_BIT_MEMORY_SHIFT = "Memory shifted for more than 1 bit";
export const WORD_ONLY_MEMORY_SHIFT = "You can only shift words in memory";
export const IMMEDIATE_SHIFT_MAX_SIZE = "You can only shift for at most 8 bits while using immediate values";
export const ONE_BIT_MEMORY_ROTATE = "Memory shifted for more than 1 bit";
export const WORD_ONLY_MEMORY_ROTATE = "You can only rotate words in memory";
export const IMMEDIATE_ROTATE_MAX_SIZE = "You can only rotate for at most 8 bits while using immediate values";
export const BRA_OFFSET_TOO_LONG = "Offset too long for BRA";
export const BEQ_OFFSET_TOO_LONG = "Offset too long for BEQ";
export const BNE_OFFSET_TOO_LONG = "Offset too long for BNE";
export const BGE_OFFSET_TOO_LONG = "Offset too long for BGE";
export const BGT_OFFSET_TOO_LONG = "Offset too long for BGT";
export const BLE_OFFSET_TOO_LONG = "Offset too long for BLE";
export const BLT_OFFSET_TOO_LONG = "Offset too long for BLT";


// Misc
export const LAST_INSTRUCTION_DEFAULT_TEXT = "Most recent instruction will be shown here.";
export const AT_LINE = " at line: ";
