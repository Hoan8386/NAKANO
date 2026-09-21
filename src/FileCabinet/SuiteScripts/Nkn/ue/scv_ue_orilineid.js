/**
 * Nội dung:
 * =======================================================================================
 *  Date                Author                  Description
 *  18 Sep 2026		 	Huy Pham                Init&Create file, Bổ sung chức năng Ori line, from mr.Quân (https://app.clickup.com/t/3773072/86d45grxc)
 */
/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 */
define(['../common/scv_common_orilineid.js'],
    
    (commonOriLineId) => {
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
            commonOriLineId.initOriLineNumTrans(scriptContext);
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
            commonOriLineId.updOriLineNumTrans(scriptContext);
        }

        return {
            beforeLoad,
			beforeSubmit,
        }

    });
