import React, { useState } from 'react'
import TextField from '@material-ui/core/TextField';
import Button from '@material-ui/core/Button';
import Axios from 'axios';
  
function SearchG() {
  
  return (
    <div style={{ marginLeft: '40%', marginTop: '60px' }}>
      
      <TextField id="standard-basic" label="Search some games" variant="standard" />
      <Button variant="outlined">Outlined</Button>

    </div>
  );
}
  
export default SearchG;