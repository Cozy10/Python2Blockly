PyBlock.CONVERT_BINOPS = { 
    "Sub" : "MINUS",
    "Add" : "ADD",
    "Mult" : "MULTIPLY",
    "Div" : "DIVIDE",
    "Pow" : "POWER"
};

PyBlock.createOpBlock = (op, left, right, returnType, node)=>{
    return PyBlock.create_block("math_arithmetic", node.lineno, 
        returnType, {
        "OP": op
    }, {
        "A": left,
        "B": right
    }, {
        "inline": true
    });
}

PyBlock.BINOPS = [
    ["+", "Add", Blockly.Python.ORDER_ADDITIVE, 'Return the sum of the two numbers.', 'increase', 'by'],
    ["-", "Sub", Blockly.Python.ORDER_ADDITIVE, 'Return the difference of the two numbers.', 'decrease', 'by'],
    ["*", "Mult", Blockly.Python.ORDER_MULTIPLICATIVE, 'Return the product of the two numbers.', 'multiply', 'by'],
    ["/", "Div", Blockly.Python.ORDER_MULTIPLICATIVE, 'Return the quotient of the two numbers.', 'divide', 'by'],
    ["%", "Mod", Blockly.Python.ORDER_MULTIPLICATIVE, 'Return the remainder of the first number divided by the second number.',
    'modulo', 'by'],
    ["**", "Pow", Blockly.Python.ORDER_EXPONENTIATION, 'Return the first number raised to the power of the second number.',
    'raise', 'to'],
    ["//", "FloorDiv", Blockly.Python.ORDER_MULTIPLICATIVE, 'Return the truncated quotient of the two numbers.',
    'floor divide', 'by'],
    ["<<", "LShift", Blockly.Python.ORDER_BITWISE_SHIFT, 'Return the left number left shifted by the right number.',
    'left shift', 'by'],
    [">>", "RShift", Blockly.Python.ORDER_BITWISE_SHIFT, 'Return the left number right shifted by the right number.',
    'right shift', 'by'],
    ["|", "BitOr", Blockly.Python.ORDER_BITWISE_OR, 'Returns the bitwise OR of the two values.',
    'bitwise OR', 'using'],
    ["^", "BitXor", Blockly.Python.ORDER_BITWISE_XOR, 'Returns the bitwise XOR of the two values.',
    'bitwise XOR', 'using'],
    ["&", "BitAnd", Blockly.Python.ORDER_BITWISE_AND, 'Returns the bitwise AND of the two values.',
    'bitwise AND', 'using'],
    ["@", "MatMult", Blockly.Python.ORDER_MULTIPLICATIVE, 'Return the matrix multiplication of the two numbers.',
    'matrix multiply', 'by']
];
var BINOPS_SIMPLE = ['Add', 'Sub', 'Mult', 'Div', 'Mod', 'Pow'];
var BINOPS_BLOCKLY_DISPLAY_FULL = PyBlock.BINOPS.map(
    binop => [binop[0], binop[1]]
);
var BINOPS_BLOCKLY_DISPLAY = BINOPS_BLOCKLY_DISPLAY_FULL.filter(
    binop => BINOPS_SIMPLE.indexOf(binop[1]) >= 0
);
PyBlock.BINOPS_AUGASSIGN_DISPLAY_FULL =PyBlock.BINOPS.map(
    binop => [binop[4], binop[1]]
);
PyBlock.BINOPS_AUGASSIGN_DISPLAY = PyBlock.BINOPS_AUGASSIGN_DISPLAY_FULL.filter(
    binop => BINOPS_SIMPLE.indexOf(binop[1]) >= 0
);

var BINOPS_BLOCKLY_GENERATE = {};
PyBlock.BINOPS_AUGASSIGN_PREPOSITION = {};
PyBlock.BINOPS.forEach(function (binop) {
    BINOPS_BLOCKLY_GENERATE[binop[1]] = [" " + binop[0], binop[2]];
    PyBlock.BINOPS_AUGASSIGN_PREPOSITION[binop[1]] = binop[5];
    //Blockly.Constants.Math.TOOLTIPS_BY_OP[binop[1]] = binop[3];
});

PyBlock.prototype['ast_BinOp'] = function (node, parent) {
    let left = node.left;
    let op = node.op.prototype._astname;
    let right = node.right;
    let blockName = "math_arithmetic";
    let leftNode = this.convert(left, node);
    let rightNode = this.convert(right, node);

    // create list with item [...] repeated n times (voir ast_List)
    if(PyBlock.getVarType(leftNode) === "List" && op ==="Mult"){
        let item;
        if (left._astname ==="List"){
            item = this.convert(left.elts[0], left);   
        }
        else{
            item = leftNode;
        }
        let block = PyBlock.create_block("lists_repeat", node.lineno, "List", {},
            {
                "ITEM": item,
                "NUM": rightNode
            },
            {}, {}, {});
        block.elementsType = PyBlock.getVarType(item);
        return block;
    }
    if (left._astname == 'List'){
        return this.convert(left, node)
    }

    
    
    // both left and right are String so String op
    if(PyBlock.getVarType(leftNode) === "Str" && PyBlock.getVarType(rightNode) === "Str"){
        let res, values, nodesComputed, blockGuess;
        //the left node is already a text_join so create a new one with text on the right
        if(leftNode.currentBlock === "text_join"){
            nodesComputed = leftNode.nodesComputed.concat([rightNode]);
            values = {};
            nodesComputed.forEach((element, i)=>{
                values['ADD'+i] = element;
            });
            blockGuess = leftNode.blockGuess;
        }
        else{
            nodesComputed = [leftNode, rightNode];
            values = {"ADD0":leftNode, "ADD1":rightNode};
        }
        res = PyBlock.create_block("text_join", node.lineno, "Str", {}, values,
            {}, {"@items":nodesComputed.length});
        if(leftNode.variableName != undefined){ //Maybe it's an append op
            blockGuess = "text_append";
        }
        res.blockGuess = blockGuess;
        res.nodesComputed = nodesComputed;      //Save computed sub_block if we have to change block later
        res.currentBlock = "text_join";         //Say we just finished a text_join block so don't do another one concat them
        return res;
    }

    if ( op === "Mod"){
        blockName = "math_modulo";
        return PyBlock.create_block(blockName, node.lineno, "int", {},
        {
            "DIVIDEND": leftNode,
            "DIVISOR": rightNode
        },
        {});
    }

    // Math op between 2 number so if one element is a float or it's a division result will be a float otherwise it's an int
    let typeLeft = PyBlock.getVarType(leftNode), typeRight = PyBlock.getVarType(rightNode);
    let block_op = PyBlock.CONVERT_BINOPS[op];

    // check if 
    if(block_op === "ADD" && leftNode.blockGuess === "find"){
        if(right._astname === "Num"){
            let num = Sk.ffi.remapToJs(right.n);
            leftNode = leftNode.childNodes[1].childNodes[0];
            if(num === 1){
                return leftNode;
            }
            else{
                rightNode = PyBlock.createNumBlock(num-1, "int", node);
            }
        }
    }
    let type = ( ((op === "DIVIDE") || (typeLeft === "float") || (typeRight === "float")) ? "float" : "int");
    return PyBlock.create_block(blockName, node.lineno, 
        type, {
        "OP": block_op
    }, {
        "A": leftNode,
        "B": rightNode
    }, {
        "inline": true
    });
}

PyBlock.prototype['math_arithmetic'] = PyBlock.prototype['ast_BinOp'];
