import Axios from 'axios';
import { useState } from "react";

function API(){


    const firstgames = () => {
        Axios.get('http://localhost:25565/games?discount=75&mustSame=true')
            .then((response) => {
                const T0 = (response.data[0].game);
                const P0 = (response.data[0].price);
                const D0 = (response.data[0].discount_percent);
                const Pl0 = (response.data[0].platform);

                return{
                    T0, P0, D0, Pl0
                }
            })
        }

                return(
                    <div class="bg-gray-900 min-h-screen flex flex-col items-center justify-center text-3xl text-white">
        
                    <h3>Top 6 reduced Games:</h3>
                    
                    <ul class="space-y-8"> {/* GAME COL */}
            
            
            
                        <li class="text-sm leading-6">
                          <figure class="relative flex flex-col-reverse bg-slate-50 rounded-lg p-6 dark:bg-slate-800 dark:highlight-white/5">
                            <blockquote class="mt-6 text-slate-700 dark:text-slate-300">{firstgames} est disponible sur  avec % de réduction!!</blockquote>
                            <figcaption class="flex items-center space-x-4">
                              <div class="flex-auto">
                                <div class="text-base text-slate-900 font-semibold dark:text-slate-300"></div>
                                <div class="mt-0.5"></div>
                              </div>
                            </figcaption>
                          </figure>
                        </li>
                    </ul>
{/*                     <div class="grid grid-cols-1 gap-6 lg:gap-8 sm:grid-cols-2 lg:grid-cols-3 max-h-[33rem] overflow-hidden">
                      
            
                        
                    </div> */}
                </div>

                )}


export default API;