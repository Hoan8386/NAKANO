/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 */
define([
    'N/record',
],
    (
        record,
    ) => {
        const onRequest = (scriptContext) => {
            let params = scriptContext.request.parameters;
            let response = scriptContext.response;
            
            try{
                let wbsRec =record.load({type: "wbs", id: 7, isDynamic: true});

                response.setHeader({
                    name: 'Content-Type',
                    value: 'application/json'
                });
                
                response.write(JSON.stringify(wbsRec));
            }
            catch(err){
                //log.error("Error: Try.catch", err);

                response.write(err.message ?? err);
            }
        }

        return {onRequest}

    });
