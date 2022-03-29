import Axios from 'axios';
import { useState } from "react";

function API(){


    const firstgames = () => {
        Axios.get('http://localhost:25565/games?discount=75&mustSame=true')
            .then((response) => {

                const zero = response.data[0].game + " est disponible sur "+ response.data[0].platform +" avec "+ response.data[0].discount_percent +"% de réduction!! ";
                const one = response.data[1].game + " est disponible sur "+ response.data[1].platform +" avec "+ response.data[1].discount_percent +"% de réduction!! ";
                const two = response.data[2].game + " est disponible sur "+ response.data[2].platform +" avec "+ response.data[2].discount_percent +"% de réduction!! ";
                const three = response.data[3].game + " est disponible sur "+ response.data[3].platform +" avec "+ response.data[3].discount_percent +"% de réduction!! ";
                const four = response.data[4].game + " est disponible sur "+ response.data[4].platform +" avec "+ response.data[4].discount_percent +"% de réduction!! ";
                
                document.getElementById("firstgame").innerHTML = `${zero} <br/> ${one} <br/> ${two} <br/> ${three} <br/> ${four}`;
                  
              })
        }

                return(
                    <div class="bg-gray-900 min-h-screen flex flex-col items-center justify-center text-3xl text-white">
        
        <button onClick={firstgames} className="text-blue-600 text-4xl font-mono">Refresh list</button>
                    
                    <ul class="space-y-8"> {/* GAME COL */}
            
                        <li id="API" class="text-sm leading-6">
                          <figure class="relative flex flex-col-reverse bg-slate-50 rounded-lg p-6 dark:bg-slate-800 dark:highlight-white/5">
                            <blockquote id="firstgame" class="mt-6 text-slate-700 dark:text-slate-300">Please, hit the 'refresh list' button and wait about 5seconds(depends on your connection) !!DON'T SPAM!!</blockquote>
                            <figcaption class="flex items-center space-x-4">
                              <div class="flex-auto">
                                <div class="text-base text-slate-900 font-semibold dark:text-slate-300">Top discounted games !</div>
                                <div class="mt-0.5">On Steam and Epic Games</div>
                              </div>
                            </figcaption>
                          </figure>
                        </li>
                    </ul>







                </div>

                )}


export default API;