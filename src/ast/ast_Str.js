PyBlock.prototype.isSingleChar = function (text) {
    return text === "\n" || text === "\t";
};

PyBlock.prototype.isDocString = function (node, parent) {
    return (parent._astname === 'Expr' &&
        parent._parent &&
        ['FunctionDef', 'ClassDef'].indexOf(parent._parent._astname) !== -1 &&
        parent._parent.body[0] === parent);
};

PyBlock.prototype.isSimpleString = function (text) {
    return text.split("\n").length <= 2 && text.length <= 40;
};

PyBlock.prototype.dedent = function (text, levels, isDocString) {
    if (!isDocString && text.charAt(0) === "\n") {
        return text;
    }
    let split = text.split("\n");
    let indentation = "    ".repeat(levels);
    let recombined = [];
    // Are all lines indented?
    for (let i = 0; i < split.length; i++) {
        // This was a blank line, add it unchanged unless its the first line
        if (split[i] === '') {
            if (i !== 0) {
                recombined.push("");
            }
        // If it has our ideal indentation, add it without indentation
        } else if (split[i].startsWith(indentation)) {
            let unindentedLine = split[i].substr(indentation.length);
            if (unindentedLine !== '' || i !== split.length - 1) {
                recombined.push(unindentedLine);
            }
        // If it's the first line, then add it unmodified
        } else if (i === 0) {
            recombined.push(split[i]);
        // This whole structure cannot be uniformly dedented, better give up.
        } else {
            return text;
        }
    }
    return recombined.join("\n");
};

// TODO: Handle indentation intelligently
PyBlock.prototype['ast_Str'] = function (node, parent) {
    let s = node.s;
    let text = Sk.ffi.remapToJs(s);
    /*if (text.startsWith("http") && text.endsWith(".png")) {
        return PyBlock.create_block("ast_Image", node.lineno, {}, {}, {},
            {"@src": text});
    } else*/ if (this.isSingleChar(text)) {
        return PyBlock.create_block("ast_StrChar", node.lineno, "Str", {"TEXT": text});
    } else if (this.isDocString(node, parent)) {
        let dedented = this.dedent(text, this.levelIndex - 1, true);
        return [PyBlock.create_block("ast_StrDocstring", node.lineno, undefined, {"TEXT": dedented})];
    } else if (text.indexOf('\n') === -1) {
        return PyBlock.create_block("text", node.lineno, "Str", {"TEXT": text});
    } else {
        let dedented = this.dedent(text, this.levelIndex - 1, false);
        return PyBlock.create_block("text", node.lineno, "Str", {"TEXT": dedented});
    }
};

// in text (args[0]) find first occurence of text (args[1])
PyBlock.prototype.METHODS_BLOCKS["Str"]["find"] = function(args, node){
    var values = {"VALUE":PyBlock.prototype.convert(args[0], node)};
    if(args[1] != undefined){
        Object.assign(values, {"FIND":PyBlock.prototype.convert(args[1], node)});
    }
    return {
        "name":"text_indexOf", // block type="text_print"
        "fields":{
            "END":"FIRST"
        },        // tag field of the block <field ...>
        "values":values,     // tag value
        "statements":{},     //tag statement
        "returnType":"int",
        "parentBlock": (left)=>{
            let res = PyBlock.createOpBlock("MINUS", left, PyBlock.createNumBlock(1, "int", node), "int", node); 
            res.blockGuess = "find";
            return res;
        },
        "guessType":"find"
    }
}

// in text (args[0]) find last occurence of text (args[1])
PyBlock.prototype.METHODS_BLOCKS["Str"]["rfind"] = function(args, node){
    var values = {"VALUE":PyBlock.prototype.convert(args[0], node)};
    if(args[1] != undefined){
        Object.assign(values, {"FIND":PyBlock.prototype.convert(args[1], node)});
    }
    return {
        "name":"text_indexOf", // block type="text_print"
        "fields":{
            "END":"LAST"
        },        // tag field of the block <field ...>
        "values":values,                  // tag value
        "statements":{},     //tag statement
        "returnType":"int",
        "parentBlock": (left)=>{
            let res = PyBlock.createOpBlock("MINUS", left, PyBlock.createNumBlock(1, "int", node), "int", node); 
            res.blockGuess = "find";
            return res;
        },
        "guessType":"find"
    }
}

// in text get random letter, args[0] is the text
PyBlock.prototype.FUNCTIONS_BLOCKS["text_random_letter"] = function(args, node){
    var values = {"VALUE":PyBlock.prototype.convert(args[0], node)};
    return {
        "name":"text_charAt", // block type="text_print"
        "fields":{
            "WHERE":"RANDOM",
        },        // tag field of the block <field ...>
        "values":values,                  // tag value
        "statements":{},     //tag statement
        "mutations":{
            "@at":"false"
        },
        "returnType":"char"
    }
}

// to UPPER CASE from string, args[0] is the string
PyBlock.prototype.METHODS_BLOCKS["Str"]["upper"] = function(args, node){
    return {
        "name":"text_changeCase", // block type="text_print"
        "fields":{
            "CASE":"UPPERCASE"
        },        // tag field of the block <field ...>
        "values":{
            "TEXT":PyBlock.prototype.convert(args[0], node) // recursive conversion for args[0]
        },                  // tag value
        "statements":{},     //tag statement
        "returnType":"Str"
    }
}

// to lower case from string, args[0] is the string
PyBlock.prototype.METHODS_BLOCKS["Str"]["lower"] = function(args, node){
    return {
        "name":"text_changeCase", // block type="text_print"
        "fields":{
            "CASE":"LOWERCASE"
        },        // tag field of the block <field ...>
        "values":{
            "TEXT":PyBlock.prototype.convert(args[0], node) // recursive conversion for args[0]
        },                  // tag value
        "statements":{},     //tag statement
        "returnType":"Str"
    }
}

// to Title Case from string, args[0] is the string
PyBlock.prototype.METHODS_BLOCKS["Str"]["title"] = function(args, node){
    return {
        "name":"text_changeCase", // block type="text_print"
        "fields":{
            "CASE":"TITLECASE"
        },        // tag field of the block <field ...>
        "values":{
            "TEXT":PyBlock.prototype.convert(args[0], node) // recursive conversion for args[0]
        },                  // tag value
        "statements":{},     //tag statement
        "returnType":"Str"
    }
}

// Trim spaces from both sides of string, args[0] is the string
PyBlock.prototype.METHODS_BLOCKS["strip"] = function(args, node){
    return {
        "name":"text_trim", 
        "fields":{
            "MODE":"BOTH"
        },        // tag field of the block <field ...>
        "values":{
            "TEXT":PyBlock.prototype.convert(args[0], node) // recursive conversion for args[0]
        },                  // tag value
        "statements":{},     //tag statement
        "returnType":"Str"
    }
}

// Trim spaces from left side of string, args[0] is the string
PyBlock.prototype.METHODS_BLOCKS["Str"]["lstrip"] = function(args, node){
    return {
        "name":"text_trim", 
        "fields":{
            "MODE":"LEFT"
        },        // tag field of the block <field ...>
        "values":{
            "TEXT":PyBlock.prototype.convert(args[0], node) // recursive conversion for args[0]
        },                  // tag value
        "statements":{},     //tag statement
        "returnType":"Str"
    }
}

// Trim spaces from right side of string, args[0] is the string
PyBlock.prototype.METHODS_BLOCKS["rstrip"] = function(args, node){
    return {
        "name":"text_trim", 
        "fields":{
            "MODE":"RIGHT"
        },        // tag field of the block <field ...>
        "values":{
            "TEXT":PyBlock.prototype.convert(args[0], node) // recursive conversion for args[0]
        },                  // tag value
        "statements":{},     //tag statement
        "returnType":"Str"
    }
}

// Prompt for text with message, args[0] is the message
PyBlock.prototype.FUNCTIONS_BLOCKS["text_prompt"] = function(args, node){
    var values = {};
    if(args != undefined){
        Object.assign(values, {"TEXT":PyBlock.prototype.convert(args[0], node)});
    }

    // Prompt for number with message
    if(node.python_type != undefined && node.python_type == "float"){
        return {
            "name":"text_prompt_ext", // block type="text_print"
            "fields":{
                "TYPE":"NUMBER"
            },        // tag field of the block <field ...>
            "values":values,                  // tag value
            "mutations":{
                "@type":"NUMBER"
            },
            "statements":{},     //tag statement
            "returnType":"float"
        }
    }

    return {
        "name":"text_prompt_ext", // block type="text_print"
        "fields":{
            "TYPE":"TEXT"
        },        // tag field of the block <field ...>
        "values":values,                  // tag value
        "mutations":{
            "@type":"TEXT"
        },
        "statements":{},     //tag statement
        "returnType":"Str"
    }
}