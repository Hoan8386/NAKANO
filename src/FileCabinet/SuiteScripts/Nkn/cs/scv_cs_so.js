/**
 * Nội dung: 
 * Mapping:
 * =======================================================================================
 *  Date                Author                  Description
 *  21 Sep 2026         Huy Pham                Init, create file, Calc Biliing Schedule, from ms.Phương Anh(https://app.clickup.com/t/3773072/14yhnhmfqun)
 */
/**
 * @NApiVersion 2.1
 * @NScriptType ClientScript
 * @NModuleScope SameAccount
 */
define([

    '../common/scv_common_project2so.js',
], (
    commonProject2SO,
) => {
    /**
     * Function to be executed after page is initialized.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.currentRecord - Current form record
     * @param {string} scriptContext.mode - The mode in which the record is being accessed (create, copy, or edit)
     *
     * @since 2015.2
     */
    const pageInit = (scriptContext) => {
        const mode = scriptContext.mode;
        const curRec = scriptContext.currentRecord;

        if (mode === "create") {
            commonProject2SO.initTransformProject2SO(curRec);
        }

    }

    /**
     * Function to be executed when field is changed.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.currentRecord - Current form record
     * @param {string} scriptContext.sublistId - Sublist name
     * @param {string} scriptContext.fieldId - Field name
     * @param {number} scriptContext.lineNum - Line number. Will be undefined if not a sublist or matrix field
     * @param {number} scriptContext.columnNum - Line number. Will be undefined if not a matrix field
     *
     * @since 2015.2
     */
    const fieldChanged = (scriptContext) => {
        let curRec = scriptContext.currentRecord;
        let sublistId = scriptContext.sublistId;
        let lineNum = scriptContext.line;
        let fieldId = scriptContext.fieldId;

        if (fieldId === "job") {
            commonProject2SO.initTransformProject2SO(curRec);
        }
    }


    return {
        pageInit,
        fieldChanged,
    };

});
