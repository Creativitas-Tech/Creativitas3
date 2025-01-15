import { Link } from 'react-router-dom';

const TableOfContents = (props) => {

    return (
        <>
            <div className="title center-self">Table Of Contents</div>
            <div className="flex-container">
                <div className="flex-child" >
                    <div className="contents-container" >
                        <div className="title center-self">Assignments</div>
                        {Object.keys(props.assignments).map((option) => (
                            <Link 
                                key={option}
                                to={`/${option}`} 
                                className="text-button list" 
                                onClick={() => props.setPage(option)}
                            >
                                {option}
                            </Link>
                        ))}
                    </div>
                </div>
                <div className="flex-child ">
                    <div className="contents-container">
                        <div className="title center-self">Examples</div>
                        {Object.keys(props.examples).map((option) => (
                            <Link 
                                key={option}
                                to={`/${option}`} 
                                className="text-button list" 
                                onClick={() => props.setPage(option)}
                            >
                                {option}
                            </Link>
                        ))}
                    </div>
                </div>
                <div className="flex-child ">
                    <div className="contents-container">
                        <div className="title center-self">References</div>
                        {Object.keys(props.references).map((option) => (
                            <Link 
                                key={option}
                                to={`/${option}`} 
                                className="text-button list" 
                                onClick={() => props.setPage(option)}
                            >
                                {option}
                            </Link>
                        ))}
                    </div>
                </div>
            </div>
        </>
    );
};

export default TableOfContents;