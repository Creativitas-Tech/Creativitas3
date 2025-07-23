// import { useState, useEffect } from "react";
import Editor from '../Editor.js';
// import './Template.css';

const Template = (props) => {
    return (
        <>
            <div className="intro-container">
                <div className="title">{props.title}</div>
                <div dangerouslySetInnerHTML={{ __html: props.intro }} />
            </div>

            {props.starterCode?.trim() && (
                <Editor 
                    page={props.page} 
                    starterCode={props.starterCode} 
                    canvases={props.canvases} 
                />
            )}

            {props.description && (
                <div className="description-container">
                    <div dangerouslySetInnerHTML={{ __html: props.description }} />
                </div>
            )}
        </>
    );
};


export default Template;
