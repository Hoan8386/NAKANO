/**
 * Nội dung: 
 * Mapping:
 * =======================================================================================
 *  Date                Author                  Description
 *  21 Sep 2026         Huy Pham                Init, create file, Calc Biliing Schedule, from ms.Phương Anh(https://app.clickup.com/t/3773072/14yhnhmfqun)
 */
define(['N/search',
    '../lib/scv_lib_function.js',
], (search,
    lbf,
) => {

    const initTransformProject2SO = (saleOrdRec) =>{
        let jobId = saleOrdRec.getValue("job");
        if(!jobId) return;

        const itemSublistId = "item";
        const sizeItemSublist = saleOrdRec.getLineCount(itemSublistId);
        
        if(!NS.form.isInited() || sizeItemSublist === 0){
            setTimeout(() => initTransformProject2SO(saleOrdRec), 200);
            return;
        }
        
        const projectLkf = search.lookupFields({
            type: "job", id: jobId, columns: [
                "custentity_scv_project_quantity", "custentity_scv_project_rate", "jobprice"
            ]
        });
        
        const projectQuantity = projectLkf.custentity_scv_project_quantity * 1;
        const projectRate = projectLkf.custentity_scv_project_rate * 1;
        const jobPrice = projectLkf.jobprice * 1;
        
        for(let i = 0; i < sizeItemSublist; i++){
            saleOrdRec.selectLine(itemSublistId, i);

            let itemId = saleOrdRec.getCurrentSublistValue(itemSublistId, "item");
            if(!itemId) continue;

            lbf.setCurrentSublistValueData(saleOrdRec, itemSublistId, [
                "quantity", "rate", "amount",
            ], [
                projectQuantity, projectRate, jobPrice,
            ]);

            saleOrdRec.commitLine(itemSublistId);
        }
    }

    return {
        initTransformProject2SO,
    };

});
