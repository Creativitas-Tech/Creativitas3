// import { useState, useEffect } from "react";
//import { useParams } from "react-router-dom";
import Editor from '../Editor.js';
// import './Template.css';

const Sandbox = (props) => {
    return (
        <>

            <Editor page={props.page} starterCode={props.starterCode} canvases={props.canvases} />
            
        </>
    );
};


export default Sandbox;
