import Navbar from "./Navbar";
import Title from "./Title";
import API from "./API";
import Axios from 'axios';
import { useState } from "react";

function App() {



  return (
    <div className="App">
      
      <Navbar/>

      <Title/>
      
      <API/>
      
    </div>
  );
}

export default App;
