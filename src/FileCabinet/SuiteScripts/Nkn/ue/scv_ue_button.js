/**
 * Nội dung:
 * =======================================================================================
 *  Date                Author                  Description
 *  19 Aug 2026         Huy Pham                Init, create file
 *  03 Sep 2026         Phu Pham                Add button ROP (SG) trên màn hình Bill from mr. Quân (https://app.clickup.com/t/3773072/86d3w9cnt)
 */
/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 */
define([
    'N/record', 'N/runtime',

    '../common/scv_common_ui.js',

    '../cons/scv_cons_file.js',
], (
    record, runtime,

    commonUI,

    constFile,
) => {
    const Stores = {
        currentRecord: null,
    }

    const beforeLoad = (scriptContext) => {
        if(runtime.executionContext !== runtime.ContextType.USER_INTERFACE) return;

        addButtonTypeView(scriptContext);
    };

    const addButtonTypeView = (scriptContext) => {
        if (scriptContext.type !== 'view') return;

        let form = scriptContext.form;
        let newRec = scriptContext.newRecord;

        switch (newRec.type) {
            case 'purchaseorder':
                addBtnPrint(scriptContext, 'scv_print_po_sg');
                break;
            case 'purchaserequisition':
                addBtnPrint(scriptContext, 'scv_print_rpo_sg');
                break;
            case 'vendorbill':
                addBtnPrint(scriptContext, 'scv_print_rop_sg');
                break;
        }

        commonUI.addIconToButton(form);
    };

    const addBtnPrint = (scriptContext, _printFile, _entryPointFunc = 'addBtnPrint') => {
        if (!_printFile) return;

        let curRec = getCurrentRecord(scriptContext);

        try{
            let pathScriptPrint = constFile.getCurrentRootFolder() + `/print/${_printFile}.js`;

            require([pathScriptPrint], function (modulePrint) {
                modulePrint[_entryPointFunc](scriptContext, curRec);
            });
        }
        catch(err){
            log.error("Error: try.catch.addBtnPrint", err);
        }
    };

    const getCurrentRecord = (scriptContext) => {
        let newRec = scriptContext.newRecord;
        let curRec = Stores.currentRecord;

        if (!curRec && newRec.id) {
            Stores.currentRecord = record.load({type: newRec.type, id: newRec.id,});

            curRec = Stores.currentRecord;
        } else {
            curRec = newRec;
        }

        return curRec;
    };

    return { beforeLoad };
});
