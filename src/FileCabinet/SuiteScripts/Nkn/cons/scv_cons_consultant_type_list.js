/**
 * Nội dung: 
 * =======================================================================================
 *  Date                Author                  Description
 *  27 Sep 2026         Thanh Hoan			    Init, create file 
 */
define([],
    () => {
        const Records = {
            //https://11696446.app.netsuite.com/app/common/custom/custrecordentrylist.nl?rectype=1905
            Architects: {
                ID: 1,
                NAME: "Architects"
            },
            ID: {
                ID: 5,
                NAME: "ID"
            },
            Landscape: {
                ID: 4,
                NAME: "Landscape"
            },
            ME: {
                ID: 3,
                NAME: "M&E"
            },
            QS: {
                ID: 6,
                NAME: "M&E"
            },
            Structure: {
                ID: 2,
                NAME: "Structure"
            },
            
        }

        return {
            TYPE: "customlist_scv_p_consultant_type",
            Records,
        };
        
    });
