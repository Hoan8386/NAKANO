/**
 * Nội dung:
 * =======================================================================================
 *  Date                Author                  Description
 *  18 Sep 2026		 	Huy Pham                Init&Create file, Bổ sung chức năng Ori line, from mr.Quân (https://app.clickup.com/t/3773072/86d45grxc)
 */
define([],
function() {
	const SUBLIST_ITEM = {
		ID: "item",
		RECORD_TYPE: [
			"salesorder", "purchaseorder", "returnauthorization", "vendorreturnauthorization",
			"invoice", "creditmemo", "vendorbill", "vendorcredit", "purchaserequisition",
		]
	}
	const SUBLIST_LINE = {
		ID: "line",
		RECORD_TYPE: ["journalentry"]
	}
	const SUBLIST_INVENTORY = {
		ID: "inventory",
		RECORD_TYPE: ["inventoryadjustment"]
	}

	const getSublistId = (_recType) => {
		let sublistId = SUBLIST_ITEM.ID;

		if(SUBLIST_LINE.RECORD_TYPE.includes(_recType)){
			sublistId = SUBLIST_LINE.ID;
		}
		else if(SUBLIST_INVENTORY.RECORD_TYPE.includes(_recType)){
			sublistId = SUBLIST_INVENTORY.ID;
		}

		return sublistId;
	}

	const initOriLineNumTrans = (scriptContext) => {
		let newRec = scriptContext.newRecord;
		let sublistId = getSublistId(newRec.type);

		initOriLineNum(scriptContext, sublistId, "custcol_scv_origin_line_num");
	}

	const updOriLineNumTrans = (scriptContext) => {
		let newRec = scriptContext.newRecord;
		let sublistId = getSublistId(newRec.type);

		updOriLineNum(scriptContext, sublistId, "custcol_scv_origin_line_num");
	}

	const initOriLineNum = (scriptContext, sublistId, fieldId) => {
		let triggerType = scriptContext.type;

		if(!["copy"].includes(triggerType)) return;

		let newRecord = scriptContext.newRecord;
		let lc = newRecord.getLineCount(sublistId);
		for(let i = 0; i < lc; i++){
			newRecord.setSublistValue({sublistId: sublistId, fieldId: fieldId, value: genCodeOriLineNum(i), line: i});
		}
	}

	const updOriLineNum = (scriptContext, sublistId, fieldId) => {
		let triggerType = scriptContext.type;
		let newRecord = scriptContext.newRecord;
		if(["xedit", "delete"].includes(triggerType)) return;
		
		let lc = newRecord.getLineCount(sublistId);
		
		let mapOriLineNumExist = {};

		for(let i = 0; i < lc; i++){
			let ori_line_num = newRecord.getSublistValue({sublistId: sublistId, fieldId: fieldId, line: i});
			if(!!ori_line_num){
				if(mapOriLineNumExist[ori_line_num]){
					ori_line_num = genCodeOriLineNum(i);
				}
				else{
					mapOriLineNumExist[ori_line_num] = true;
					continue;
				}
			}
			else{
				ori_line_num = genCodeOriLineNum(i);
			}
			
			newRecord.setSublistValue({sublistId: sublistId, fieldId: fieldId, value: ori_line_num, line: i});
			
			mapOriLineNumExist[ori_line_num] = true;
		}
	}

	const genCodeOriLineNum = (_seq = 0) => {
		return Math.round((new Date()).getTime()) + "_" + getRandomNumber() + (_seq||0);
	}

	const getRandomNumber = () => {
		let random = Math.floor(Math.random() * 9999) + 1;
		random = random.toString().padStart(4, '0');
		return random;
	}

    return {
		initOriLineNumTrans,
		updOriLineNumTrans,
		initOriLineNum,
		updOriLineNum,
		genCodeOriLineNum
    };
    
});
