/**
 * Nội dung: 
 * =======================================================================================
 *  Date                Author                  Description
 *  22 Sep 2026         Huy Pham			    Init, create file, Setup Extension Form, from ms.Ngọc(https://app.clickup.com/t/3773072/14yhnhmfu6k)
 */
const _scvExtForm = {
    dataExtForm: {},
    sublist: {
        "test_sublist_id":{
            currentLineIndex: -1,
        }
    },
    initClient: function() {
        if(!NS.form.isInited()){
            setTimeout(() => {this.initClient()}, 100);
            return;
        }

        let objExtForm = document.getElementById('scv_extense_form_data_init').textContent;
        if(!objExtForm) return;

        this.dataExtForm = JSON.parse(objExtForm);
        
        this.addTooltipCustom();
        this.addNoWrapSubist();
        this.hideEditRemoveSublist();
        this.addWidthColumnSublist();
        this.addSequenceColumn();

        if(NS.form.isViewMode()){
            
        }
        else {
            this.hideAddLineSublist();
            this.setDisabledField();
        }
    },
    validateCondition: function(condition_formula){
        if(!condition_formula) return true;

        let isValidCondition = false;

        try{
            isValidCondition = eval(condition_formula);
        }
        catch(err){
            console.error("Error evaluating condition formula: ", err);
        }

        return isValidCondition;
    },
    fixedSublistColumn: function(){
        const NS_HEADER_HEIGHT = 96;
        const NS_TABS_HEIGHT = 33;
        const PADDING_HEIGHT = 170;

        let els = document.querySelectorAll('.uir-machine-table-container');
        for(let el of els) el.style.maxHeight = (window.innerHeight - NS_HEADER_HEIGHT - NS_TABS_HEIGHT - PADDING_HEIGHT) + 'px';

        window.addEventListener('resize', function(evt){
            let els = document.querySelectorAll('.uir-machine-table-container');
            for(let el of els) el.style.maxHeight = (window.innerHeight - NS_HEADER_HEIGHT - NS_TABS_HEIGHT - PADDING_HEIGHT) + 'px';
        });


        document.body.insertAdjacentHTML('beforeend', `
        <style>

        body:not([data-page-theme="redwood"]) .uir-machine-table-container > table:not(.openList) .listtable>tbody>tr:first-child:not(.uir-machine-row-last):not(.uir-machine-row-focused)>td:first-child,
        body:not([data-page-theme="redwood"]) .uir-machine-table-container > table:not(.openList) tbody>tr:first-child>td:first-child,
        body:not([data-page-theme="redwood"]) .uir-machine-table-container > table:not(.openList) .listtable>tbody>tr:first-child:not(.uir-machine-row-last):not(.uir-machine-row-focused)>td:nth-child(2),
        body:not([data-page-theme="redwood"]) .uir-machine-table-container > table:not(.openList) tbody>tr:first-child>td:nth-child(2)
        {
            z-index: 4;
        } 

        body:not([data-page-theme="redwood"]) .uir-machine-table-container > table:not(.openList) .listtable>tbody>tr:not(.uir-machine-row-last):not(.uir-machine-row-focused)>td:first-child,
        body:not([data-page-theme="redwood"]) .uir-machine-table-container > table:not(.openList) tbody>tr>td:first-child,
        body:not([data-page-theme="redwood"]) .uir-machine-table-container > table:not(.openList) .listtable>tbody>tr:not(.uir-machine-row-last):not(.uir-machine-row-focused)>td:nth-child(2),
        body:not([data-page-theme="redwood"]) .uir-machine-table-container > table:not(.openList) tbody>tr>td:nth-child(2)
        {
            position: sticky;
            left: 0;
            z-index: 3;
            border-right: 1px solid #e3e3e2 !important;
        } 

        body:not([data-page-theme="redwood"]) .uir-machine-table-container > table:not(.openList) .listtable>tbody>tr:not(.uir-machine-row-last):not(.uir-machine-row-focused)>td:nth-child(2),
        body:not([data-page-theme="redwood"]) .uir-machine-table-container > table:not(.openList) tbody>tr>td:nth-child(2)
        {
            left: 100px;
        } 

        body[data-page-theme="redwood"] .uir-machine-table-container > table tr.uir-list-headerrow:first-child > td:first-child,
        body[data-page-theme="redwood"] .uir-machine-table-container > table tr.uir-machine-headerrow:first-child > td:first-child,
        body[data-page-theme="redwood"] .uir-machine-table-container > table tr.uir-list-headerrow:first-child > td:nth-child(2),
        body[data-page-theme="redwood"] .uir-machine-table-container > table tr.uir-machine-headerrow:first-child > td:nth-child(2)
        {
            top: 0;
            z-index: 4;
        } 

        body[data-page-theme="redwood"] .uir-machine-table-container > table tr > td:first-child,
        body[data-page-theme="redwood"] .uir-machine-table-container > table tr > td:nth-child(2)
        {
            background-color: white !important;
            position: sticky;
            left: 0;
            z-index: 1;
            border-right: 1px solid #e3e3e2;
        }

        body[data-page-theme="redwood"] .uir-machine-table-container > table tr > td:nth-child(2)
        {
            left: 100px;
        }
        </style>`);
    },
    hideAddLineSublist: function(){
        try{
            //Sublist to hide Add Line button
            let arrSublist = this.dataExtForm.detail.filter(e => e.custrecord_scv_ext_d_action == 1);
            
            for(let i = 0; i < arrSublist.length; i++){
                let sublistId = arrSublist[i].custrecord_scv_ext_d_sublistid;
                if(!sublistId) continue;

                if(!this.validateCondition(arrSublist[i].custrecord_scv_ext_d_condition)) continue;
                
                jQuery(`#tbl_${sublistId}_addmultiple`).hide();
                jQuery(`#${sublistId}_buttons .uir-insert`).css({"display": "none"});
                jQuery(`#${sublistId}_buttons .uir-copy`).css({"display": "none"});
                jQuery(`#${sublistId}_copy`).css({"display": "none"});

                machines[sublistId].allow_insert = false;
                machines[sublistId].refresheditmachine();
            }
            
        }
        catch(err){
            console.error("Error in hideAddLineSublist: ", err);
        }
    },
    hideEditRemoveSublist: function(){
        try{
            let isViewMode = NS.form.isViewMode();

            //Sublist to hide Edit and Remove button
            let arrSublist = this.dataExtForm.detail.filter(e => e.custrecord_scv_ext_d_action == 8);
            for(let i = 0; i < arrSublist.length; i++){
                let sublistId = arrSublist[i].custrecord_scv_ext_d_sublistid;
                if(!sublistId) continue;

                if(!this.validateCondition(arrSublist[i].custrecord_scv_ext_d_condition)) continue;

                if(isViewMode){
                    this.hideEditRemoveSublist_Execute(sublistId);
                }
                else{
                    jQuery(`#${sublistId}_buttons .uir-remove`).css({"display": "none"});
                }
                
            }
        }
        catch(err){
            console.error("Error in hideEditRemoveSublist: ", err);
        }
    },
    hideEditRemoveSublist_Execute: function(_sublistId){
        let tabSublistbody = jQuery("#" + _sublistId + "__tab tbody");

        let isOfSplits = false;
        if(!tabSublistbody || tabSublistbody.length == 0){
            tabSublistbody = jQuery("#" + _sublistId + "_splits tbody");

            if(tabSublistbody && tabSublistbody.length > 0){
                isOfSplits = true;
            }
        }

        if(!tabSublistbody || tabSublistbody.length == 0){
            setTimeout(() => { this.hideEditRemoveSublist_Execute(_sublistId); }, 100);
            return;
        }

        //solution case refresh line
        if(tabSublistbody[0].getAttribute("data-scv-custom-hide-column") == "T"){
            setTimeout(() => { this.hideEditRemoveSublist_Execute(_sublistId); }, 100);
            return;
        }

        let idxColumnEdit = this.hideEditRemoveSublist_IndexColumn(_sublistId, "Edit");
        let idxColumnRemove = this.hideEditRemoveSublist_IndexColumn(_sublistId, "Remove");
        
        let lstLine = jQuery("#" + _sublistId + "__tab tr");

        if(isOfSplits){
            lstLine = jQuery("#" + _sublistId + "_splits tr");
        }

        for(let i = 0; i < lstLine.length; i++){

            try{
                if(idxColumnRemove > -1){
                    lstLine[i].querySelectorAll("td")[idxColumnRemove].hidden = true;
                }

                if(idxColumnEdit > -1){
                    lstLine[i].querySelectorAll("td")[idxColumnEdit].hidden = true;
                }
            }catch(err){
            
            }
            
        }
        tabSublistbody[0].setAttribute("data-scv-custom-hide-column", "T");

        this.hideEditRemoveSublist_Execute(_sublistId);
    },
    hideEditRemoveSublist_IndexColumn : function(_sublistId, _label){
        let lstColumnHeader = jQuery("#" + _sublistId + "__tab thead tr td");

        if(lstColumnHeader.length == 0){
            lstColumnHeader = jQuery("#" + _sublistId + "_splits #" + _sublistId + "header td");
        }

        for(let i = 0; i < lstColumnHeader.length; i++){
            if(lstColumnHeader[i]?.getAttribute("data-nsps-label") == _label){
                return i;
                break;
            }
        }
        return -1;
    },
    setDisabledField: function(){
        try{
            let arrField = this.dataExtForm.detail.filter(e => e.custrecord_scv_ext_d_action == 3);
            for(let i = 0; i < arrField.length; i++){
                let fieldId = arrField[i].custrecord_scv_ext_d_fieldid;
                let sublistId = arrField[i].custrecord_scv_ext_d_sublistid;
                let condition = arrField[i].custrecord_scv_ext_d_condition;
                
                if(!!sublistId && !!fieldId){
                    this.sublist[sublistId] = this.sublist[sublistId] || {};

                    this.setDisabledField_SublistExecute(sublistId, fieldId, condition || true);
                }
                else if(!!fieldId){
                    if(this.validateCondition(condition)){
                        nlapiDisableField(fieldId, true);
                    }
                }
            }
        }
        catch(err){
            console.error("Error in setDisabledField: ", err);
        }
    },
    setDisabledField_SublistExecute: function(_sublistId, _fieldId, _condition){
        let idxLineSublist = nlapiGetCurrentLineItemIndex(_sublistId) * 1;
        
        let isDisabled = this.validateCondition(_condition);
        let isDisabledCurrent = nlapiGetLineItemDisabled(_sublistId, _fieldId);

        if(idxLineSublist == this.sublist[_sublistId]?.currentLineIndex && isDisabled == isDisabledCurrent){
            setTimeout(() => {this.setDisabledField_SublistExecute(_sublistId, _fieldId, _condition)}, 100);
            return;
        }
        else{
            this.sublist[_sublistId].currentLineIndex = idxLineSublist;
        }

        nlapiDisableLineItemField(_sublistId, _fieldId, isDisabled);

        this.setDisabledField_SublistExecute(_sublistId, _fieldId, _condition)
    },
    addSequenceColumn: function(){
        try{
            let arrSublist = this.dataExtForm.detail.filter(e => e.custrecord_scv_ext_d_action == 4);
            if(arrSublist.length == 0) return;   
            
            let isViewMode = NS.form.isViewMode();

            for(let i = 0; i < arrSublist.length; i++){
                let sublistId = arrSublist[i].custrecord_scv_ext_d_sublistid;
                
                if(!this.validateCondition(arrSublist[i].custrecord_scv_ext_d_condition)) continue;

                if(isViewMode){
                    let sublistSplits = document.getElementById(sublistId + "_splits") ?? document.getElementById(sublistId + "__tab");

                    for(let i = 0; i < sublistSplits.rows.length; i++){
                        let noCell = sublistSplits.rows[i].insertCell(0);
                        if(i == 0){
                            noCell.setAttribute("class", "listheadertdleft listheadertextb uir-column-medium uir-list-header-td");
                            noCell.setAttribute("data-label", "No.");
                            noCell.setAttribute("data-nsps-type", "columnheader");
                            noCell.innerHTML = `<div class="listheader">No.</div>`;
                        }
                        else{
                            noCell.setAttribute("class", "listtexthl");
                            noCell.setAttribute("data-ns-tooltip", "No.");
                            noCell.setAttribute("align", "right");
                            noCell.innerHTML = i;
                        }
                    }
                }
                else{
                    machines[sublistId].showRowNumbers  = true;
                    machines[sublistId].refresheditmachine();
                }
                
            }
        }
        catch(err){
            console.error("Error in addSequenceColumn: ", err);
        }
    },
    addTooltipCustom: function(){
        try{
            let arrButton = this.dataExtForm.detail.filter(e => e.custrecord_scv_ext_d_action == 5);
            for(let i = 0; i < arrButton.length; i++){
                let buttonId = arrButton[i].custrecord_scv_ext_d_fieldid;
                let tooltip = arrButton[i].custrecord_scv_ext_d_description;

                if(!buttonId) continue;

                if(!this.validateCondition(arrButton[i].custrecord_scv_ext_d_condition)) continue;

                this.addTooltipCustomExecute(buttonId, tooltip);
                this.addTooltipCustomExecute("secondary" + buttonId, tooltip);
            }
        }
        catch(err){
            console.error("Error in addToottipCustom: ", err);
        }
    },
    addTooltipCustomExecute: function(_id, _tooltip){
        let objTooltip = document.getElementById(_id);
        if(!!objTooltip){
            objTooltip.setAttribute("data-ns-tooltip", _tooltip||objTooltip.value);
        }
        else {
            setTimeout(() => {this.addTooltipCustomExecute(_id, _tooltip)}, 500);
        }
    },
    addNoWrapSubist: function(){
        try{
            let strStyleCSS = ``;

            let arrSublistHeader = this.dataExtForm.detail.filter(e => e.custrecord_scv_ext_d_action == 6);
            for(let i = 0; i < arrSublistHeader.length; i++){
                let sublistId = arrSublistHeader[i].custrecord_scv_ext_d_sublistid;
                if(!sublistId) continue;

                if(!this.validateCondition(arrSublistHeader[i].custrecord_scv_ext_d_condition)) continue;

                strStyleCSS += `#${sublistId}_splits .uir-machine-headerrow{white-space: nowrap;} `;
                strStyleCSS += `#${sublistId}__tab .uir-list-headerrow {white-space: nowrap;} `;
            }

            let arrSublistLine = this.dataExtForm.detail.filter(e => e.custrecord_scv_ext_d_action == 7);
            for(let i = 0; i < arrSublistLine.length; i++){
                let sublistId = arrSublistLine[i].custrecord_scv_ext_d_sublistid;
                if(!sublistId) continue;

                if(!this.validateCondition(arrSublistLine[i].custrecord_scv_ext_d_condition)) continue;

                strStyleCSS += `#${sublistId}_splits .uir-machine-row, #${sublistId}_splits .uir-list-row-tr{white-space: nowrap;} `;
            }

            if(!strStyleCSS) return;

            jQuery('<style>').prop('type', 'text/css').html(strStyleCSS).appendTo('head');
        }
        catch(err){
            console.error("Error in addToottipCustom: ", err);
        }
    },
    addWidthColumnSublist: function(){
        try{
            let strStyleCSS = ``;

            let arrColumnSublist = this.dataExtForm.detail.filter(e => e.custrecord_scv_ext_d_action == 2);
            for(let i = 0; i < arrColumnSublist.length; i++){
                let sublistId = arrColumnSublist[i].custrecord_scv_ext_d_sublistid;
                let fieldLabel = arrColumnSublist[i].custrecord_scv_ext_d_fieldid;
                let fieldWidth = arrColumnSublist[i].custrecord_scv_ext_d_description + "";
                if(!sublistId || !fieldLabel) continue;

                if(!this.validateCondition(arrColumnSublist[i].custrecord_scv_ext_d_condition)) continue;

                if(!fieldWidth.includes("px")){
                    fieldWidth += "px";
                }

                strStyleCSS += `#${sublistId}_splits td[data-nsps-label= "${fieldLabel}" i] .listheader{width: ${fieldWidth};} `;
                strStyleCSS += `#${sublistId}__tab td[data-nsps-label= "${fieldLabel}" i] .listheader{width: ${fieldWidth};} `;
            }

            if(!strStyleCSS) return;

            jQuery('<style>').prop('type', 'text/css').html(strStyleCSS).appendTo('head');
        }
        catch(err){
            console.error("Error in addWidthColumnSublist: ", err);
        }
    },
}

_scvExtForm.initClient();