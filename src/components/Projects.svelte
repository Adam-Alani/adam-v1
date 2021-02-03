
<script lang="ts">
    import ModeSwitcher from '../ModeSwitcher.svelte';
    import Tailwindcss from '../Tailwindcss.svelte';
    import {asyncFunc} from "../utils/github_api";

    function getDate(day) {
        let created = new Date(day.created_at)
        return created.toLocaleDateString()
    }


</script>

<Tailwindcss />

<style>
</style>


<main class=" flex flex-1 flex-col justify-center bg-white ">
    <div class="py-16 mb-12  text-bgblue font-extrabold text-4xl md:text-5xl lg:text-6xl flex justify-center items-center ">
        <h1 class="select-none  ">Archives</h1>
    </div>
    <div class="flex-col flex flex-1 items-center justify-center ">
        {#await asyncFunc() then data}
                <div class=" ">
                    {#each data as repo, i}
                        {#if (i > 0 && repo.language !== null)}
                        <div class="">
                            <div class="   rounded-3xl   mx-4 my-4  transition duration-500 ease-in-out transform  hover:scale-110" >

                                <h1 class="font-semibold mt-4 mx-8 text-2xl select-none ">{(data[i].name)}<span class="float-right font-light text-xs">{getDate(data[i])}</span></h1>
                                <p class="font-medium px-8 mt-4  text-base select-none">{(repo.description)}</p>

                                <div class="mt-2">
                                {#if ( repo.language !== "C#")}
                                        <div class="mx-8 bg-{repo.language} inline-block rounded ">
                                            <h1 class="mx-4 my-1 select-none ">{repo.language}</h1>
                                        </div>
                                        <a href={repo.html_url} target="_blank">
                                        <img src="images/logos/github.png" class="float-right mr-5" width="28px" height="auto"/>
                                        </a>
                                {:else}
                                        <div class="mx-8 bg-green-600 inline-block rounded ">
                                            <h1 class="mx-4 my-1 ">{repo.language}</h1>
                                        </div>
                                        <a href={repo.html_url} target="_blank">
                                            <img src="images/logos/github.png" class="float-right mr-5" width="28px" height="auto"/>
                                        </a>
                                    {/if}
                                </div>

                                </div>
                            <hr/>
                            </div>
                        {/if}
                    {/each}
                </div>
        {/await}
    </div>


</main>

