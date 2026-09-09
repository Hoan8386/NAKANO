/**
 * Nội dung: 
 * =======================================================================================
 *  Date                Author                  Description
 *  24 Aug 2026         Huy Pham			    Init, create file
 */
define([],
    () => {
        const Records = {
            Original: {
                ID: 1,
                NAME: "Original"
            },
            Additional: {
                ID: 2,
                NAME: "Additional"
            },
            PCSum: {
                ID: 3,
                NAME: "PC Sum"
            },
            All: {
                ID: 4,
                NAME: "All"
            },
        }


        return {
            TYPE: "customlist_scv_projecct_classification",
            Records,
        };
        
    });
    