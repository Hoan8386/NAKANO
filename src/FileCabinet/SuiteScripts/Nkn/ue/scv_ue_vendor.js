/**
 * Nội dung: 
 * =======================================================================================
 *  Date                Author                  Description
 *  19 Aug 2026         Huy Pham                Init, create file. Sinh mã Vendor, from ms.Ngọc(https://app.clickup.com/t/3773072/86d42w9hv)
 */
/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 */
define([
        '../common/scv_common_vendor_code.js',
    ],

    (
        commVendorCode,
    ) => {
        /**
         * Defines the function definition that is executed before record is loaded.
         * @param {Object} scriptContext
         * @param {Record} scriptContext.newRecord - New record
         * @param {string} scriptContext.type - Trigger type; use values from the context.UserEventType enum
         * @param {Form} scriptContext.form - Current form
         * @param {ServletRequest} scriptContext.request - HTTP request information sent from the browser for a client action only.
         * @since 2015.2
         */
        const beforeLoad = (scriptContext) => {
            
        }

        /**
         * Defines the function definition that is executed before record is submitted.
         * @param {Object} scriptContext
         * @param {Record} scriptContext.newRecord - New record
         * @param {Record} scriptContext.oldRecord - Old record
         * @param {string} scriptContext.type - Trigger type; use values from the context.UserEventType enum
         * @since 2015.2
         */
        const beforeSubmit = (scriptContext) => {
            let triggerType = scriptContext.type;
            let newRec = scriptContext.newRecord;
            let oldRec = scriptContext.oldRecord;

            if (["create", "edit", "copy"].includes(triggerType)) {
                commVendorCode.genVendorCode(newRec);
            }
        }

        /**
         * Defines the function definition that is executed after record is submitted.
         * @param {Object} scriptContext
         * @param {Record} scriptContext.newRecord - New record
         * @param {Record} scriptContext.oldRecord - Old record
         * @param {string} scriptContext.type - Trigger type; use values from the context.UserEventType enum
         * @since 2015.2
         */
        const afterSubmit = (scriptContext) => {
        }

        return {
            //beforeLoad,
            beforeSubmit,
            //afterSubmit
        }

    });
