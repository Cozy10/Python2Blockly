PyBlock.BLOCKS.push({
    "type": "raw_code",
    "message0": "Code Block: %1 %2",
    "args0": [
        {"type": "input_dummy"},
        {"type": "field_multilinetext", "name": "TEXT", "value": ''}
    ],
    "colour": PyBlock.COLOR.PYTHON,
    "previousStatement": null,
    "nextStatement": null,
});
/*
Blockly.Python['ast_Raw'] = function (block) {
    var code = block.getFieldValue('TEXT') + "\n";
    return code;
};
*/