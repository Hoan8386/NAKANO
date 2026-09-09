/**
 * Nội dung: Sinh số chứng từ (tranid) cho Purchase Order theo Project
 * Quy tắc: AAAAAAA-BBB (AAAAAAA: entityid của Project Source, BBB: số tăng dần theo từng Project)
 * =======================================================================================
 *  Date                Author                  Description
 *  19 Aug 2026		    Huy Pham			    Init, create file. Sinh số PO theo Project, from ms.Ngọc(https://app.clickup.com/t/3773072/86d41zjat)
 */
define(['N/search',
    '../cons/scv_cons_seqnumber.js',
],(search,
    constSeqNumber,
) => {

    const SEQUENCE_TYPE = "PURCHASEORDER";
    const SEPARATOR = "-";
    const SEQ_LENGTH = 3;

    const getProjectPrefix = (_projectSegmentId) => {
        if(!_projectSegmentId) return "";

        let objLookup = search.lookupFields({
            type: 'customrecord_cseg_scv_sg_proj',
            id: _projectSegmentId,
            columns: ['custrecord_scv_project_source.entityid']
        });

        return objLookup['custrecord_scv_project_source.entityid'] || "";
    }

    const genPurchaseOrderNumber = (_poRec) => {
        let projectId = _poRec.getValue('cseg_scv_sg_proj');
        if(!projectId) return "";

        let prefix = getProjectPrefix(projectId);
        if(!prefix) return "";

        let prefix_tranid = prefix + SEPARATOR;

        let tranid_old = _poRec.getValue('tranid') || "";

        //Edit: Project không đổi thì giữ nguyên số cũ, chỉ sinh lại khi prefix thay đổi
        if(!!_poRec.id && tranid_old.indexOf(prefix_tranid) == 0){
            return tranid_old;
        }

        let subsidiaryId = _poRec.getValue('subsidiary');

        let curSeqNumber = 1;

        let arrSeqNumber = constSeqNumber.getDataSourceWithFilters({
            custrecord_scv_rcn_subsidiary: subsidiaryId,
            custrecord_scv_rcn_type: SEQUENCE_TYPE,
            custrecord_scv_rcn_prefix: prefix
        });
        if(arrSeqNumber.length > 0){
            curSeqNumber = arrSeqNumber[0].custrecord_scv_rcn_currentnumber * 1 + 1;

            constSeqNumber.updateCurrentNumber(arrSeqNumber[0].internalid, curSeqNumber);
        }
        else{
            constSeqNumber.createSequence({
                name: `${SEQUENCE_TYPE}.${prefix}`.toUpperCase(),
                custrecord_scv_rcn_subsidiary: subsidiaryId,
                custrecord_scv_rcn_type: SEQUENCE_TYPE,
                custrecord_scv_rcn_prefix: prefix,
                custrecord_scv_rcn_currentnumber: curSeqNumber,
            });
        }

        let tranid = prefix_tranid + curSeqNumber.toString().padStart(SEQ_LENGTH, '0');

        _poRec.setValue('tranid', tranid);

        return tranid;
    }

    return {
        genPurchaseOrderNumber,
    };

});
