// import useSwr from "swr";
// import Uploading from "./Uploading";
import React, {useState} from "react";
import keplerGlReducer from "kepler.gl/reducers";
import {applyMiddleware, combineReducers, createStore} from "redux";
import {taskMiddleware} from "react-palm/tasks";
import {Provider, useDispatch} from "react-redux";
import KeplerGl from "kepler.gl";
import {addDataToMap} from "kepler.gl/actions";
import * as ExcelJS from "exceljs";
import {processCsvData} from 'kepler.gl/processors';
import './uploading.css'

const MAX_COUNT = 10;

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

const removeArrayItem = (arr, itemToRemove) => {
    return arr.filter(item => item !== itemToRemove)
}



function Uploading() {

    const [uploadedFiles, setUploadedFiles] = useState([])
    const [fileLimit, setFileLimit] = useState(false);


    const dispatch = useDispatch();
    const myDatasets = [];
    const handleUploadFiles = files => {

        const uploaded = [...uploadedFiles];
        let limitExceeded = false;
        files.some(async (file) => {

            if (uploaded.findIndex((f) => f.name === file.name) === -1) {
                uploaded.push(file);
                console.log('MY FILE', file)


                let values = [];
                let res='latitude,longitude,value,animal';
                const wb = new ExcelJS.Workbook();
                const reader = new FileReader()

                reader.readAsArrayBuffer(file)
                reader.onload = () => {
                    const buffer = reader.result;

                    wb.xlsx.load(buffer).then(workbook => {


                        var worksheet = workbook.getWorksheet(1);
                        const lat = Number(worksheet.getCell('A2'));
                        const lon =  Number(worksheet.getCell('B2'));
                        console.log('LAT',lat)
                        console.log('LON',lon)
                        let animalsList = ["Anthozoa",
                            "Ascidia",
                            "Ascophyllum",
                            "Asterias",
                            "Balanus",
                            "Branchiomma",
                            "Buccinum",
                            "Caridea",
                            "Chionoecetes",
                            "Cnidaria",
                            "Crossaster",
                            "Cryptonatica",
                            "Diopedos bispinis",
                            "Fish",
                            "Fucus",
                            "Gersemia fruticosa",
                            "Gorgonocephalus",
                            "Gymnocanthus tricuspis",
                            "Heliometra",
                            "Hormathia",
                            "Human",
                            "Hyas",
                            "Laminaria_digitata",
                            "Lithothamnion",
                            "Mysis oculata",
                            "Ophiopholis",
                            "Ophiura robusta",
                            "Pagurus pubescens",
                            "Porifera",
                            "Strongylocentrotus",
                            "Trash",
                            "Urasterias",
                            "Urticina",
                            "arenicola",
                            "corophiidae",
                            "none"];


                        for (let i = 7;i<worksheet.actualColumnCount+1;i++){
                            let animalName;
                            let column = worksheet.getColumn(i).values;
                            console.log("ONE COLUMN", column)
                            animalName = column[4];
                            let splitColumn = column.slice(5);
                            console.log("ANIMAL", animalName);
                            console.log("NEXT COLUMN", splitColumn)
                            let colmnSum = 0;




                            for(let x =0;x< splitColumn.length;x++){
                                if(splitColumn[x]!=null){
                                    console.log("VALUE",splitColumn[x])
                                    colmnSum= colmnSum+Number(splitColumn[x])
                                }
                            }

                            console.log(colmnSum);
                            // [lat , lon, colmnSum]

                            let coordinates = [lat, lon, colmnSum, animalName].join(",");
                            animalsList = removeArrayItem(animalsList, animalName);
                            console.log("ANIMAL NAME",animalName);
                            console.log("ANIMAL LIST",animalsList);
                            values.push(coordinates);

                        }
                        for(let m =0; m<animalsList.length;m++){
                            let coordinates = [lat, lon, '0', animalsList[m]].join(",");
                            values.push(coordinates)
                        }
                        res = res+'\n'+ values.join( '\n');
                        console.log(res);


                        console.log('here',res)

                        const dataset = {
                            info: {id: file.name, label: file.name},
                            data: processCsvData(res)
                        }
















                        myDatasets.push(dataset);
                        dispatch(addDataToMap({
                            datasets: myDatasets ,
                            options: {centerMap: true, readOnly: false},
                        }))



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




