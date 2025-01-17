

PyBlock.prototype['ast_Assign'] = function (node, parent) {
    let targets = node.targets;
    let value = node.value;
    let values;
    let fields = {};
    let simpleTarget = (targets.length === 1 && targets[0]._astname === 'Name');
    let valueNode;

    // in list set #
    if(targets[0]._astname === 'Subscript'){
        let mode = "SET";
        let at = "true";
        let where = "FROM_START";
        let index = targets[0].slice.value;

        let set_values = {
            "LIST":this.convert(targets[0].value, node)
        }

        // # from end
        if(index != null && index.op != undefined && index.op.prototype._astname === 'USub'){
            index = index.operand;
            where = "FROM_END";
            // last
            if(index.n != undefined && index.n.v == 1){
                at = "false";
                where = "LAST";
            }
        }

        // first
        else if(index.n != undefined && index.n.v == 0){
            at = "false";
            where = "FIRST";
        }

        if(at == "true"){
            Object.assign(set_values, {"AT":this.convert(index, node)});
        }

        Object.assign(set_values, {"TO":this.convert(value, node)});
        return PyBlock.create_block(
            "lists_setIndex", // type
            node.lineno, // line_number
            PyBlock.getVarType(set_values["LIST"]),
            {
                "MODE":mode,
                "WHERE":where
            }, // fields
            set_values //values
            , {} // settings
            , 
            {
                "@at":at // mutations
            }
            , {} // statements
            );
    }
    if (simpleTarget) {
        valueNode = this.convert(value, node);
        // Check if it's append
        if(valueNode.blockGuess === "text_append"){
            // Search if our variable is the first of the operation
            if(valueNode.nodesComputed[0].variableName === Sk.ffi.remapToJs(targets[0].id)){
                valueNode.nodesComputed.splice(0, 1);
                let block;
                if(valueNode.nodesComputed.length == 1){
                    block = valueNode.nodesComputed[0];
                }
                else{
                    let values = {};
                    valueNode.nodesComputed.forEach((element, i)=>{
                        values["ADD"+i] = element;
                    });
                    block = PyBlock.create_block("text_join", node.lineno, "Str", {},
                        values, {}, {"@items":valueNode.nodesComputed.length});
                }
                return PyBlock.create_block("text_append", node.lineno, "Str", {
                        "VAR":  Sk.ffi.remapToJs(targets[0].id)
                    }, {
                        "TEXT": block
                    }, {});
            }
        }    
        values = {};
        fields['VAR'] = Sk.ffi.remapToJs(targets[0].id);
        // save variable type
        PyBlock.setVariable(fields['VAR'], PyBlock.getVarType(valueNode));
        
        values['VALUE'] = valueNode;
        
    } else {
        values = this.convertElements("TARGET", targets, node);
    }

    return PyBlock.create_block("variables_set", node.lineno, undefined,
        fields,
        values,
        {
        }, {
            "@targets": targets.length,
            "@simple": simpleTarget
        });
};