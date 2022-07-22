import React from "react";
import keplerGlReducer from "kepler.gl/reducers";
import { createStore, combineReducers, applyMiddleware } from "redux";
import { taskMiddleware } from "react-palm/tasks";
import { Provider, useDispatch } from "react-redux";
import KeplerGl from "kepler.gl";
import { addDataToMap } from "kepler.gl/actions";
import * as ExcelJS from "exceljs";
// import useSwr from "swr";
// import Uploading from "./Uploading";
import {useState} from "react";
import {processCsvData} from 'kepler.gl/processors';
import './uploading.css'
const MAX_COUNT = 5;

const customizedKeplerGlReducer = keplerGlReducer
    .initialState({
        uiState: {
            // hide side panel to disallow user customize the map
            readOnly: false,
            currentModal: null,
            // customize which map control button to show
            mapControls: {
                visibleLayers: {
                    show: false
                },
                mapLegend: {
                    show: true,
                    active: true
                },
                toggle3d: {
                    show: false
                },
                splitMap: {
                    show: false
                }
            }
        }
    });

const reducers = combineReducers({
    keplerGl: customizedKeplerGlReducer,
});


const store = createStore(reducers, {}, applyMiddleware(taskMiddleware));


export default function App() {
    return (
        <Provider store={store}>
            <Uploading />
            <Map />
        </Provider>
    );
}







function Map() {

    return (
        <KeplerGl
            id="covid"
            mapboxApiAccessToken='pk.eyJ1IjoiZWt0bGFncmFuemgxIiwiYSI6ImNrczZkd3EwbzAwczkycW96b3ZpbGJuaTMifQ.hVA0mIakF4asjiJmh7gPEA'//{process.env.REACT_APP_MAPBOX_API}
            width={window.innerWidth}
            height={window.innerHeight}
        />
    );

}




function Uploading() {

    const [uploadedFiles, setUploadedFiles] = useState([])
    const [fileLimit, setFileLimit] = useState(false);


    const dispatch = useDispatch();

    const handleUploadFiles = files => {

        const uploaded = [...uploadedFiles];
        let limitExceeded = false;
        files.some(async (file) => {

            if (uploaded.findIndex((f) => f.name === file.name) === -1) {
                uploaded.push(file);
                console.log('MY FILE', file)



                let fields = ["latitude","longitude"];
                let rows =[];
                let res='';
                const wb = new ExcelJS.Workbook();
                const reader = new FileReader()

                reader.readAsArrayBuffer(file)
                reader.onload = () => {
                    const buffer = reader.result;
                    wb.xlsx.load(buffer).then(workbook => {


                        // console.log(workbook, 'workbook instance')

                        var worksheet = workbook.getWorksheet(1);

                        const additionalFields = worksheet.getRow(4).values;
                        console.log(additionalFields);


                        for(let i=7;i<additionalFields.length;i++){
                            fields.push(additionalFields[i].toString())
                        }

                        console.log(fields);
                        for (let i = 5;i<worksheet.actualRowCount+2;i++){

                            const headers =[];
                            let coordinates = [74.573650 + Number(i), 55.109332+Number(i)];
                            let row = worksheet.getRow(i).values;


                            for(let j =7; j<worksheet.actualColumnCount+1;j++){
                                if (row[j]){
                                    headers.push(Number(row[j]))
                                }else{
                                    headers.push(0)
                                }
                            }

                            let r = (coordinates.concat(headers)).join(",");
                            rows.push(r)
                        }
                        res = fields+'\n'+rows.join( '\n');
                        console.log(res);


                        console.log('here',res)

                        const dataset = {
                            info: {id: 'test_data', label: 'My Csv'},
                            data: processCsvData(res)
                        };

                        dispatch(addDataToMap({
                            datasets: [dataset],
                            options: {centerMap: true, readOnly: false}
                        }));



                    })
                }






                if (uploaded.length === MAX_COUNT) setFileLimit(true);
                if (uploaded.length > MAX_COUNT) {
                    alert(`You can only add a maximum of ${MAX_COUNT} files`);
                    setFileLimit(false);
                    limitExceeded = true;
                    return true;
                }
            }
        })
        if (!limitExceeded) setUploadedFiles(uploaded)

    }

    const handleFileEvent =  (e) => {
        const chosenFiles = Array.prototype.slice.call(e.target.files)
        handleUploadFiles(chosenFiles);
    }

    return (
        <div className="Uploading">

            <input id='fileUpload' type='file' multiple
                   accept='.xlsx, .xls'
                   onChange={handleFileEvent}
                   disabled={fileLimit}
            />

            <label htmlFor='fileUpload'>
                <a  className={`btn btn-primary ${!fileLimit ? '' : 'disabled' } `}>Upload Files</a>
            </label>

            <div className="uploaded-files-list">
                {uploadedFiles.map(file => (
                    <div >
                        {file.name}
                    </div>
                ))}
            </div>

        </div>
    );
}

// function excelToJson(file) {
//
//
//     let fields = ["latitude","longitude"];
//     let rows =[];
//     let res;
//     const wb = new ExcelJS.Workbook();
//     const reader = new FileReader()
//
//     reader.readAsArrayBuffer(file)
//     reader.onload = () => {
//         const buffer = reader.result;
//         wb.xlsx.load(buffer).then(workbook => {
//
//
//             // console.log(workbook, 'workbook instance')
//
//             var worksheet = workbook.getWorksheet(1);
//
//             const additionalFields = worksheet.getRow(4).values;
//             console.log(additionalFields);
//
//
//             for(let i=7;i<additionalFields.length;i++){
//                 fields.push(additionalFields[i].toString())
//             }
//
//             // fields = fields.join(",")+'\n';
//             console.log(fields);
//             for (let i = 5;i<worksheet.actualRowCount+2;i++){
//
//                 const headers =[];
//                 let coordinates = [74.573650 + Number(i), 55.109332+Number(i)];
//                 let row = worksheet.getRow(i).values;
//
//
//                 for(let j =7; j<worksheet.actualColumnCount+1;j++){
//                     if (row[j]){
//                         headers.push(Number(row[j]))
//                     }else{
//
//                         headers.push(0)
//                     }
//                 }
//
//                 let r = (coordinates.concat(headers)).join(",");
//                 rows.push(r)
//             }
//             res = fields+'\n'+rows.join( '\n');
//             console.log(res);
//             // console.log(processCsvData(res));
//
//             // workbook.eachSheet((sheet, id) => {
//             //     sheet.eachRow((row, rowIndex) => {
//             //         console.log(row.values, rowIndex)
//             //     })
//             // })
//
//
//
//
//             return(processCsvData(res))
//         })
//     }
//
//
//     return(processCsvData(res))
// }





